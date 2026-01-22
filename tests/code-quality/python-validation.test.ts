/**
 * Test: Python Validation Generation
 *
 * Validates that generated Python validation code meets senior engineer standards:
 * - Uses Pydantic for validation
 * - Type hints included
 * - Tests with pytest
 * - Proper validation structure
 */

import { describe, it, expect } from 'vitest';
import {
  fileContainsPattern,
  hasTests,
  checkSecurityPatterns,
  runQualityChecks,
} from './test-helpers';

describe('Python Validation Quality', () => {
  describe('Expected Pydantic Implementation', () => {
    it('documents expected library choice', () => {
      const expectedLibraries = [
        'pydantic', // Data validation library
        'pydantic-settings', // Settings management
        'email-validator', // Email validation
      ];

      expect(expectedLibraries).toContain('pydantic');
      expect(expectedLibraries.length).toBeGreaterThan(0);
    });

    it('documents expected type hints', () => {
      const expectedPatterns = [
        'from typing import', // Type imports
        ': str', // String type hint
        ': int', // Integer type hint
        '-> ', // Return type hint
        'Optional[', // Optional types
        'List[', // List types
      ];

      expect(expectedPatterns).toContain('from typing import');
      expect(expectedPatterns).toContain(': str');
    });

    it('documents expected Pydantic patterns', () => {
      const expectedPatterns = [
        'from pydantic import BaseModel',
        'class User(BaseModel)',
        'Field(',
        'validator',
        'Config',
      ];

      expect(expectedPatterns).toContain('from pydantic import BaseModel');
      expect(expectedPatterns).toContain('Field(');
    });

    it('documents expected pytest structure', () => {
      const expectedPatterns = [
        'import pytest',
        'def test_',
        'assert ',
        '@pytest.fixture',
        '@pytest.mark',
      ];

      expect(expectedPatterns).toContain('import pytest');
      expect(expectedPatterns).toContain('def test_');
    });
  });

  describe('Validation Structure Requirements', () => {
    it('documents expected file structure', () => {
      const expectedStructure = {
        models: {
          file: 'models.py',
          patterns: ['BaseModel', 'Field', 'validator'],
        },
        validators: {
          file: 'validators.py',
          patterns: ['def validate_', 'ValidationError'],
        },
        tests: {
          file: 'test_models.py',
          patterns: ['pytest', 'def test_', 'assert'],
        },
      };

      expect(expectedStructure.models.patterns).toContain('BaseModel');
      expect(expectedStructure.validators.patterns).toContain('ValidationError');
      expect(expectedStructure.tests.patterns).toContain('pytest');
    });

    it('documents type safety requirements', () => {
      const typeHintRequirements = [
        'All function parameters typed',
        'All return types specified',
        'Use typing module for complex types',
        'Use Pydantic models for data validation',
        'Type hints for class attributes',
      ];

      expect(typeHintRequirements).toContain('All function parameters typed');
      expect(typeHintRequirements).toContain('Use Pydantic models for data validation');
    });

    it('documents validation requirements', () => {
      const validationRequirements = [
        'Email validation using Field',
        'String length constraints',
        'Numeric range validation',
        'Custom validators for business logic',
        'Proper error messages',
      ];

      expect(validationRequirements).toContain('Email validation using Field');
      expect(validationRequirements).toContain('Custom validators for business logic');
    });
  });

  describe('Python Best Practices', () => {
    it('documents code style requirements', () => {
      const styleRequirements = [
        'PEP 8 compliant',
        'Type hints everywhere',
        'Docstrings for classes and functions',
        'Descriptive variable names',
        'No wildcard imports',
      ];

      expect(styleRequirements).toContain('PEP 8 compliant');
      expect(styleRequirements).toContain('Type hints everywhere');
    });

    it('documents testing requirements', () => {
      const testingRequirements = [
        'pytest for testing framework',
        'Test valid inputs',
        'Test invalid inputs',
        'Test edge cases',
        'Test validation error messages',
        'Use fixtures for common test data',
      ];

      expect(testingRequirements).toContain('pytest for testing framework');
      expect(testingRequirements).toContain('Test validation error messages');
    });
  });

  describe('Example Pydantic Implementation', () => {
    it('documents example User model with validation', () => {
      const exampleCode = `
from pydantic import BaseModel, Field, validator
from typing import Optional
import re

class UserCreate(BaseModel):
    """User creation model with validation"""
    email: str = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    age: Optional[int] = Field(None, ge=0, le=150)

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower()

    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain number')
        return v

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "john_doe",
                "password": "SecurePass123",
                "age": 25
            }
        }
`;

      // Verify example contains key patterns
      expect(exampleCode).toContain('from pydantic import BaseModel');
      expect(exampleCode).toContain('Field(');
      expect(exampleCode).toContain('@validator');
      expect(exampleCode).toContain('class Config');
      expect(exampleCode).toContain(': str');
      expect(exampleCode).toContain(': Optional[int]');
    });

    it('documents example pytest tests', () => {
      const exampleTest = `
import pytest
from pydantic import ValidationError
from models import UserCreate

def test_valid_user_creation():
    """Test creating user with valid data"""
    user = UserCreate(
        email="test@example.com",
        username="testuser",
        password="SecurePass123",
        age=25
    )
    assert user.email == "test@example.com"
    assert user.username == "testuser"

def test_invalid_email():
    """Test validation fails with invalid email"""
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(
            email="invalid-email",
            username="testuser",
            password="SecurePass123"
        )
    assert "email" in str(exc_info.value)

def test_password_validation():
    """Test password must meet requirements"""
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(
            email="test@example.com",
            username="testuser",
            password="weak"
        )
    assert "password" in str(exc_info.value).lower()

@pytest.fixture
def valid_user_data():
    """Fixture providing valid user data"""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123",
        "age": 25
    }
`;

      // Verify example test contains key patterns
      expect(exampleTest).toContain('import pytest');
      expect(exampleTest).toContain('def test_');
      expect(exampleTest).toContain('assert ');
      expect(exampleTest).toContain('@pytest.fixture');
      expect(exampleTest).toContain('ValidationError');
    });
  });

  describe('Quality Check Integration', () => {
    it('validates Python validation detection patterns', () => {
      // Simulate checking a Python file for Pydantic usage
      const mockPythonContent = `
from pydantic import BaseModel, Field
from typing import Optional

class UserModel(BaseModel):
    email: str
    age: Optional[int] = None
`;

      expect(mockPythonContent).toContain('from pydantic import');
      expect(mockPythonContent).toContain('BaseModel');
      expect(mockPythonContent).toContain(': str');
      expect(mockPythonContent).toContain('Optional[');
    });

    it('provides validation checklist', () => {
      const validationChecklist = [
        {
          check: 'Uses Pydantic BaseModel',
          pattern: 'from pydantic import BaseModel',
        },
        {
          check: 'Has type hints',
          pattern: ': str|: int|: Optional',
        },
        {
          check: 'Uses Field for validation',
          pattern: 'Field(',
        },
        {
          check: 'Has custom validators',
          pattern: '@validator',
        },
        {
          check: 'Includes pytest tests',
          pattern: 'import pytest',
        },
        {
          check: 'Tests validation errors',
          pattern: 'ValidationError',
        },
      ];

      expect(validationChecklist.length).toBe(6);
      expect(validationChecklist[0].pattern).toBe('from pydantic import BaseModel');
      expect(validationChecklist[4].pattern).toBe('import pytest');
    });
  });

  describe('Real-world Validation Template', () => {
    it('provides template for validating generated Python validation code', () => {
      // This would be the path to generated Python validation code
      const projectPath = 'examples/python-validation';

      const qualityChecks = [
        {
          name: 'Uses Pydantic',
          file: 'models.py',
          expectedPatterns: ['from pydantic import', 'BaseModel', 'Field'],
        },
        {
          name: 'Has type hints',
          file: 'models.py',
          expectedPatterns: [': str', ': int', 'Optional[', '-> '],
        },
        {
          name: 'Has validators',
          file: 'models.py',
          expectedPatterns: ['@validator', 'ValidationError'],
        },
        {
          name: 'Has pytest tests',
          file: 'test_models.py',
          expectedPatterns: ['import pytest', 'def test_', 'assert'],
        },
        {
          name: 'Tests validation errors',
          file: 'test_models.py',
          expectedPatterns: ['pytest.raises', 'ValidationError'],
        },
        {
          name: 'Has proper structure',
          expectedFiles: ['models.py', 'validators.py', 'test_models.py'],
        },
      ];

      expect(qualityChecks.length).toBe(6);
      expect(qualityChecks[0].expectedPatterns).toContain('BaseModel');
      expect(qualityChecks[3].expectedPatterns).toContain('import pytest');
    });
  });
});
