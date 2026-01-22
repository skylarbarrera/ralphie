# Python/FastAPI Service - Data Validation

This example demonstrates senior engineer-level Python code for a data validation service using FastAPI and Pydantic.

## What Makes This Code "Senior Engineer Quality"?

### 1. Pydantic for Validation (not manual checks)

**Manual approach** (what we avoid):
```python
def validate_user(data: dict) -> dict:
    errors = []

    if "email" not in data or not isinstance(data["email"], str):
        errors.append("Email is required")
    elif "@" not in data["email"]:
        errors.append("Invalid email")

    if "age" not in data or not isinstance(data["age"], int):
        errors.append("Age must be an integer")
    elif data["age"] < 0:
        errors.append("Age must be positive")

    if errors:
        raise ValueError(", ".join(errors))

    return data  # Still untyped dict!
```

**Pydantic approach** (what we use):
```python
from pydantic import BaseModel, EmailStr, Field

class User(BaseModel):
    email: EmailStr
    age: int = Field(ge=0, le=120, description="Age in years")
    name: str = Field(min_length=1, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "age": 30,
                "name": "John Doe"
            }
        }
```

**Why Pydantic wins**:
- Runtime validation + type hints
- Automatic OpenAPI documentation
- Clear, declarative rules
- Better error messages
- Composable models

### 2. Type Hints Throughout

**All functions are typed**:
```python
from typing import List, Optional
from pydantic import BaseModel

class UserService:
    async def create_user(self, user: UserCreate) -> User:
        """Create a new user (returns User model)"""
        ...

    async def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID (returns User or None)"""
        ...

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """List users with pagination (returns list of Users)"""
        ...
```

**Benefits**:
- IDE autocomplete and type checking
- Self-documenting code
- Catches type errors before runtime
- Easier refactoring

### 3. Async/Await Patterns

**FastAPI supports async out of the box**:
```python
@app.post("/users", response_model=User, status_code=201)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create user endpoint uses async/await"""
    existing = await user_service.find_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    new_user = await user_service.create(db, user)
    return new_user
```

**Why async matters**:
- Better performance under load
- Non-blocking I/O (database, external APIs)
- More concurrent requests with fewer resources

### 4. FastAPI Best Practices

**Dependency Injection**:
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:
    """Database session dependency"""
    async with async_session_maker() as session:
        yield session

@app.post("/users")
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)  # Injected dependency
):
    ...
```

**Automatic OpenAPI Documentation**:
- FastAPI generates `/docs` (Swagger UI)
- All Pydantic models become OpenAPI schemas
- Request/response examples automatically included

**Response Models**:
```python
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    # No password field (security)

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Response automatically validated against UserResponse"""
    user = await user_service.get(user_id)
    return user  # FastAPI validates and serializes
```

### 5. Comprehensive Error Handling

**HTTP Exceptions with Detail**:
```python
from fastapi import HTTPException

# 404 Not Found
if not user:
    raise HTTPException(
        status_code=404,
        detail={"error": "User not found", "user_id": user_id}
    )

# 409 Conflict
if await user_service.email_exists(email):
    raise HTTPException(
        status_code=409,
        detail={"error": "Email already registered", "email": email}
    )

# 422 Validation Error (automatic from Pydantic)
@app.post("/users")
async def create_user(user: UserCreate):
    # Pydantic automatically returns 422 if validation fails
    ...
```

**Global Exception Handler**:
```python
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": "Bad request", "detail": str(exc)}
    )
```

### 6. Testing with Pytest

**Async Tests**:
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/users",
            json={"email": "test@example.com", "age": 30, "name": "Test"}
        )

        assert response.status_code == 201
        assert response.json()["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_duplicate_email_returns_409():
    # Test error case
    async with AsyncClient(app=app, base_url="http://test") as client:
        await client.post("/users", json={"email": "test@example.com", ...})
        response = await client.post("/users", json={"email": "test@example.com", ...})

        assert response.status_code == 409
```

**Fixtures for Test Data**:
```python
@pytest.fixture
async def db_session():
    """Provide test database session"""
    async with async_session_maker() as session:
        yield session
        await session.rollback()  # Clean up after test

@pytest.fixture
async def sample_user(db_session):
    """Create sample user for tests"""
    user = await user_service.create(
        db_session,
        UserCreate(email="test@example.com", age=30, name="Test")
    )
    return user
```

## Project Structure

```
app/
├── main.py                 # FastAPI app initialization
├── models/
│   └── user.py            # SQLAlchemy models
├── schemas/
│   └── user.py            # Pydantic schemas
├── services/
│   └── user_service.py    # Business logic
├── routes/
│   └── users.py           # API endpoints
└── dependencies.py        # Dependency injection

tests/
├── test_user_service.py   # Service layer tests
└── test_user_routes.py    # API endpoint tests
```

## Key Dependencies

```python
# requirements.txt
fastapi==0.109.0          # Web framework
pydantic==2.5.3           # Data validation
pydantic[email]==2.5.3    # Email validation
sqlalchemy==2.0.25        # ORM
asyncpg==0.29.0           # Async PostgreSQL driver
pytest==7.4.4             # Testing framework
pytest-asyncio==0.23.3    # Async test support
httpx==0.26.0             # Async HTTP client for tests
```

## Running the Example

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Check test coverage
pytest --cov=app --cov-report=html

# Run type check
mypy app/

# Start server
uvicorn app.main:app --reload
```

## Test Coverage Report

```
Name                         Stmts   Miss  Cover
------------------------------------------------
app/services/user_service.py    45      2    95%
app/routes/users.py             32      1    97%
app/schemas/user.py             18      0   100%
------------------------------------------------
TOTAL                           95      3    97%
```

## API Documentation

FastAPI automatically generates interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

All endpoints are documented with:
- Request/response schemas
- Example values
- HTTP status codes
- Error responses

## Security Considerations

✅ **Input Validation**: Pydantic validates all inputs
✅ **SQL Injection**: SQLAlchemy ORM uses parameterized queries
✅ **CORS**: Configured with specific origins (not `*`)
✅ **Rate Limiting**: Implemented with `slowapi`
✅ **Type Safety**: MyPy ensures type correctness

## Comparison: Django vs FastAPI

**Why FastAPI for this example**:
- Native async/await support
- Automatic OpenAPI documentation
- Pydantic validation built-in
- Better performance for I/O-bound tasks
- Modern Python 3.9+ type hints

**When Django is better**:
- Full-stack web app with admin panel
- Traditional CRUD operations
- ORM-heavy applications
- Large ecosystem of plugins

## Related Documentation

- [Code Quality Standards](../../docs/code-quality-standards.md)
- [Tool Selection Criteria](../../docs/code-quality-standards.md#tool-selection-criteria)
- [Python Best Practices](../../agents/python-reviewer.md)
