// Reference Implementation — Orders Vertical Slice
// This file is the canonical code example for a complete vertical slice.
// See: standards/reference-implementation.md for layer descriptions and rules.

// =============================================================================
// Layer 1: Entity (DAL)
// =============================================================================

#nullable disable

namespace MyApp.DAL.Orders.Entities
{
    [Table("order", Schema = "app")]
    [Index("OrderNumber", Name = "IX_order_order_number")]
    public partial class Order
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("account_number")]
        public int? AccountNumber { get; set; }

        [Column("account_name")]
        [StringLength(500)]
        public string AccountName { get; set; }

        [Column("created_date")]
        public DateTime CreatedDate { get; set; }

        [Column("bundle_link_key")]
        public Guid? BundleLinkKey { get; set; }
    }
}

// =============================================================================
// Layer 2: Repository Interface (DAL)
// =============================================================================

namespace MyApp.DAL.Orders.Interfaces
{
    public interface IOrderRepository : IBaseRepository<Order>
    {
        Task<IEnumerable<Order>> GetByUserIdAsync(
            int userId,
            CancellationToken cancellationToken = default);

        Task<Order?> GetByOrderNumberAsync(
            int orderNumber,
            CancellationToken cancellationToken = default);

        Task<IEnumerable<Order>> GetActiveOrdersAsync(
            CancellationToken cancellationToken = default);
    }
}

// =============================================================================
// Layer 3: Repository Implementation (DAL)
// =============================================================================

namespace MyApp.DAL.Orders.Repositories
{
    public class OrderRepository(AppDbContext context)
        : BaseRepository<Order>(context), IOrderRepository
    {
        private readonly AppDbContext _context = context;

        public async Task<IEnumerable<Order>> GetByUserIdAsync(
            int userId,
            CancellationToken cancellationToken = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedDate)
                .ToListAsync(cancellationToken);
        }

        public async Task<Order?> GetByOrderNumberAsync(
            int orderNumber,
            CancellationToken cancellationToken = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);
        }

        public async Task<IEnumerable<Order>> GetActiveOrdersAsync(
            CancellationToken cancellationToken = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Where(o => o.Status == "Active")
                .ToListAsync(cancellationToken);
        }
    }
}

// =============================================================================
// Layer 4: Request & Response DTOs (API)
// =============================================================================

namespace MyApp.API.Requests
{
    public sealed record CreateOrderRequest
    {
        public required int AccountNumber { get; init; }
        public required int ProductId { get; init; }
        public required string AccountName { get; init; }
        public required int UserId { get; init; }
        public Guid? BundleId { get; init; }
    }
}

namespace MyApp.API.Models
{
    public sealed record OrderResponse
    {
        public required int OrderId { get; init; }
        public required int AccountNumber { get; init; }
        public required string AccountName { get; init; }
        public required DateTime CreatedDate { get; init; }
        public required IReadOnlyList<string> ProductTitles { get; init; }
    }
}

// =============================================================================
// Layer 5: Cached Repository (API)
// =============================================================================

namespace MyApp.API.Repositories
{
    public sealed class CachedOrderRepository(
        IOrderRepository orderRepository,
        IAccountRepository accountRepository,
        ApiMapper mapper,
        ICacheService cache,
        ILogger<CachedOrderRepository> logger) : ICachedOrderRepository
    {
        public async Task<OrderResponse?> GetByIdAsync(
            int orderId,
            CancellationToken ct)
        {
            return await cache.GetOrAddAsync(
                CacheKey.For<OrderResponse>(orderId),
                async () =>
                {
                    var entity = await orderRepository.GetByIdAsync(orderId, ct);
                    return entity is null ? null : mapper.MapToOrderResponse(entity);
                },
                TimeSpan.FromMinutes(5));
        }

        public async Task<OrderListResponse> GetByUserIdAsync(
            int userId,
            int page,
            int pageSize,
            CancellationToken ct)
        {
            var orders = await orderRepository.GetByUserIdAsync(userId, ct);

            return new OrderListResponse
            {
                Orders = orders
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(mapper.MapToOrderResponse)
                    .ToList(),
                TotalCount = orders.Count(),
                PageNumber = page,
                PageSize = pageSize
            };
        }
    }
}

// =============================================================================
// Layer 6: API Controller
// =============================================================================

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController(
        ICachedOrderRepository cachedOrderRepository,
        IOrderRepository dalOrderRepository,
        IAccountRepository accountRepository,
        ILogger<OrdersController> logger) : ControllerBase
    {
        [HttpPost]
        [ProducesResponseType(typeof(CreateOrderResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateOrder(
            [FromBody] CreateOrderRequest request,
            CancellationToken ct)
        {
            var account = await accountRepository
                .GetByAccountNumberAsync(request.AccountNumber, ct);

            if (account is null)
                return NotFound($"Account {request.AccountNumber} not found.");

            var orderId = await cachedOrderRepository
                .CreateOrderAsync(request, ct);

            var response = new CreateOrderResponse
            {
                OrderId = orderId,
                AccountNumber = request.AccountNumber
            };

            return CreatedAtAction(
                nameof(GetOrder),
                new { orderId },
                response);
        }

        [HttpGet("{orderId:int}")]
        [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetOrder(
            int orderId,
            CancellationToken ct)
        {
            var order = await cachedOrderRepository
                .GetByIdAsync(orderId, ct);

            return order is null
                ? NotFound()
                : Ok(order);
        }

        [HttpGet("by-user/{userId:int}")]
        [ProducesResponseType(typeof(OrderListResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOrdersByUser(
            int userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            CancellationToken ct = default)
        {
            var response = await cachedOrderRepository
                .GetByUserIdAsync(userId, page, pageSize, ct);

            return Ok(response);
        }
    }
}

// =============================================================================
// Layer 7: Unit Tests
// =============================================================================

namespace MyApp.API.Tests.Controllers
{
    public sealed class OrdersControllerTests
    {
        private readonly Mock<ICachedOrderRepository> _mockCachedOrderRepository;
        private readonly Mock<IOrderRepository> _mockDalOrderRepository;
        private readonly Mock<IAccountRepository> _mockAccountRepository;
        private readonly Mock<ILogger<OrdersController>> _mockLogger;
        private readonly OrdersController _controller;

        public OrdersControllerTests()
        {
            _mockCachedOrderRepository = new Mock<ICachedOrderRepository>();
            _mockDalOrderRepository = new Mock<IOrderRepository>();
            _mockAccountRepository = new Mock<IAccountRepository>();
            _mockLogger = new Mock<ILogger<OrdersController>>();

            _controller = new OrdersController(
                _mockCachedOrderRepository.Object,
                _mockDalOrderRepository.Object,
                _mockAccountRepository.Object,
                _mockLogger.Object);
        }

        #region CreateOrder Tests

        [Fact]
        public async Task CreateOrder_ReturnsCreatedAtAction_WhenRequestIsValid()
        {
            // Arrange
            var request = new CreateOrderRequest
            {
                AccountNumber = 1001,
                ProductId = 5,
                AccountName = "Test Account",
                UserId = 42
            };

            var account = new Account { AccountNumber = 1001 };

            _mockAccountRepository
                .Setup(r => r.GetByAccountNumberAsync(1001, It.IsAny<CancellationToken>()))
                .ReturnsAsync(account);

            _mockCachedOrderRepository
                .Setup(r => r.CreateOrderAsync(request, It.IsAny<CancellationToken>()))
                .ReturnsAsync(99);

            // Act
            var result = await _controller.CreateOrder(request, CancellationToken.None);

            // Assert
            var created = Assert.IsType<CreatedAtActionResult>(result);
            var response = Assert.IsType<CreateOrderResponse>(created.Value);
            Assert.Equal(99, response.OrderId);
            Assert.Equal(1001, response.AccountNumber);

            _mockCachedOrderRepository.Verify(
                r => r.CreateOrderAsync(
                    It.Is<CreateOrderRequest>(req => req.AccountNumber == 1001),
                    It.IsAny<CancellationToken>()),
                Times.Once);
        }

        [Fact]
        public async Task CreateOrder_ReturnsNotFound_WhenAccountDoesNotExist()
        {
            // Arrange
            var request = new CreateOrderRequest
            {
                AccountNumber = 9999,
                ProductId = 5,
                AccountName = "Ghost Account",
                UserId = 42
            };

            _mockAccountRepository
                .Setup(r => r.GetByAccountNumberAsync(9999, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Account?)null);

            // Act
            var result = await _controller.CreateOrder(request, CancellationToken.None);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion

        #region GetOrder Tests

        [Fact]
        public async Task GetOrder_ReturnsOk_WhenOrderExists()
        {
            // Arrange
            var order = new OrderResponse
            {
                OrderId = 1,
                AccountNumber = 1001,
                AccountName = "Test Account",
                CreatedDate = DateTime.UtcNow,
                ProductTitles = ["Product A"]
            };

            _mockCachedOrderRepository
                .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            // Act
            var result = await _controller.GetOrder(1, CancellationToken.None);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(order, ok.Value);
        }

        [Fact]
        public async Task GetOrder_ReturnsNotFound_WhenOrderDoesNotExist()
        {
            // Arrange
            _mockCachedOrderRepository
                .Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
                .ReturnsAsync((OrderResponse?)null);

            // Act
            var result = await _controller.GetOrder(999, CancellationToken.None);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        #endregion
    }
}

// =============================================================================
// DI Registration (Program.cs snippet)
// =============================================================================

// DAL repositories (from MyApp.DAL.* NuGet packages)
services.AddScoped<IOrderRepository, OrderRepository>();
services.AddScoped<IAccountRepository, AccountRepository>();

// API-layer cached repositories
services.AddScoped<ICachedOrderRepository, CachedOrderRepository>();

// Infrastructure
services.AddSingleton<ICacheService, InMemoryCacheService>();
services.AddSingleton<ApiMapper>();
