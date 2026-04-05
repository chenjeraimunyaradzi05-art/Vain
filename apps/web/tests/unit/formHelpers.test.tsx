/**
 * Form Utilities Tests
 * Unit tests for form validation and helper functions
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useForm,
  useFormField,
  useFieldArray,
  validateEmail,
  validatePhone,
  validatePassword,
  validateRequired,
  validateUrl,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateRange,
  composeValidators,
  formatPhone,
  formatCurrency,
  formatABN,
  parseFormData,
  serializeForm,
} from '@/lib/formHelpers';

describe('Validation Functions', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('user@example.com')).toBeNull();
      expect(validateEmail('user.name@example.co.au')).toBeNull();
      expect(validateEmail('user+tag@example.org')).toBeNull();
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('invalid')).toBe('Invalid email address');
      expect(validateEmail('user@')).toBe('Invalid email address');
      expect(validateEmail('@example.com')).toBe('Invalid email address');
      expect(validateEmail('user@.com')).toBe('Invalid email address');
    });
  });

  describe('validatePhone', () => {
    it('should validate Australian phone numbers', () => {
      expect(validatePhone('0412345678')).toBeNull();
      expect(validatePhone('0412 345 678')).toBeNull();
      expect(validatePhone('+61412345678')).toBeNull();
      expect(validatePhone('(02) 1234 5678')).toBeNull();
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe('Invalid phone number');
      expect(validatePhone('abcdefghij')).toBe('Invalid phone number');
    });

    it('should allow empty when not required', () => {
      expect(validatePhone('', false)).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('SecureP@ss123')).toBeNull();
      expect(validatePassword('C0mplex!Pass')).toBeNull();
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('short')).toContain('at least 8 characters');
      expect(validatePassword('alllowercase')).toContain('uppercase');
      expect(validatePassword('ALLUPPERCASE')).toContain('lowercase');
      expect(validatePassword('NoNumbers!')).toContain('number');
      expect(validatePassword('NoSpecial123')).toContain('special character');
    });

    it('should allow custom requirements', () => {
      const weakValidator = validatePassword.configure({ 
        minLength: 4, 
        requireNumbers: false,
        requireSpecial: false,
      });
      expect(weakValidator('Test')).toBeNull();
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('value')).toBeNull();
      expect(validateRequired(0)).toBeNull();
      expect(validateRequired(false)).toBeNull();
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe('This field is required');
      expect(validateRequired(null)).toBe('This field is required');
      expect(validateRequired(undefined)).toBe('This field is required');
    });

    it('should use custom message', () => {
      expect(validateRequired('', 'Please fill this out')).toBe('Please fill this out');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBeNull();
      expect(validateUrl('http://localhost:3000')).toBeNull();
      expect(validateUrl('https://sub.domain.example.com/path?query=1')).toBeNull();
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe('Invalid URL');
      expect(validateUrl('ftp://files.example.com')).toBe('Invalid URL');
    });

    it('should allow empty when not required', () => {
      expect(validateUrl('', false)).toBeNull();
    });
  });

  describe('validateMinLength', () => {
    it('should validate strings meeting minimum', () => {
      expect(validateMinLength(5)('hello')).toBeNull();
      expect(validateMinLength(3)('abc')).toBeNull();
    });

    it('should reject strings below minimum', () => {
      expect(validateMinLength(5)('hi')).toBe('Must be at least 5 characters');
    });
  });

  describe('validateMaxLength', () => {
    it('should validate strings within maximum', () => {
      expect(validateMaxLength(10)('hello')).toBeNull();
    });

    it('should reject strings exceeding maximum', () => {
      expect(validateMaxLength(5)('hello world')).toBe('Must be at most 5 characters');
    });
  });

  describe('validatePattern', () => {
    it('should validate matching patterns', () => {
      const alphanumeric = validatePattern(/^[a-zA-Z0-9]+$/, 'Alphanumeric only');
      expect(alphanumeric('abc123')).toBeNull();
    });

    it('should reject non-matching patterns', () => {
      const alphanumeric = validatePattern(/^[a-zA-Z0-9]+$/, 'Alphanumeric only');
      expect(alphanumeric('abc-123')).toBe('Alphanumeric only');
    });
  });

  describe('validateRange', () => {
    it('should validate numbers within range', () => {
      expect(validateRange(1, 100)(50)).toBeNull();
      expect(validateRange(0, 10)(0)).toBeNull();
      expect(validateRange(0, 10)(10)).toBeNull();
    });

    it('should reject numbers outside range', () => {
      expect(validateRange(1, 100)(0)).toBe('Must be between 1 and 100');
      expect(validateRange(1, 100)(101)).toBe('Must be between 1 and 100');
    });
  });

  describe('composeValidators', () => {
    it('should run validators in order', () => {
      const validator = composeValidators(
        validateRequired,
        validateMinLength(3),
        validateMaxLength(10)
      );

      expect(validator('')).toBe('This field is required');
      expect(validator('ab')).toBe('Must be at least 3 characters');
      expect(validator('hello')).toBeNull();
      expect(validator('this is too long')).toBe('Must be at most 10 characters');
    });

    it('should return first error', () => {
      const validator = composeValidators(
        validateRequired,
        validateEmail
      );

      expect(validator('')).toBe('Email is required');
      expect(validator('invalid')).toBe('Invalid email address');
    });
  });
});

describe('Format Functions', () => {
  describe('formatPhone', () => {
    it('should format Australian mobile numbers', () => {
      expect(formatPhone('0412345678')).toBe('0412 345 678');
    });

    it('should format landline numbers', () => {
      expect(formatPhone('0212345678')).toBe('(02) 1234 5678');
    });

    it('should handle international format', () => {
      expect(formatPhone('+61412345678')).toBe('+61 412 345 678');
    });

    it('should strip non-numeric characters', () => {
      expect(formatPhone('04-1234-5678')).toBe('0412 345 678');
    });
  });

  describe('formatCurrency', () => {
    it('should format AUD by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle whole numbers', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-$500.00');
    });

    it('should use locale formatting', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('formatABN', () => {
    it('should format ABN with spaces', () => {
      expect(formatABN('12345678901')).toBe('12 345 678 901');
    });

    it('should strip existing formatting', () => {
      expect(formatABN('12 345 678 901')).toBe('12 345 678 901');
    });
  });
});

describe('useForm Hook', () => {
  const initialValues = {
    name: '',
    email: '',
    age: 0,
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useForm({ initialValues })
      );

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
    });
  });

  describe('value changes', () => {
    it('should update values', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.setValue('name', 'John');
      });

      expect(result.current.values.name).toBe('John');
    });

    it('should handle setValues for multiple fields', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.setValues({ name: 'John', email: 'john@example.com' });
      });

      expect(result.current.values.name).toBe('John');
      expect(result.current.values.email).toBe('john@example.com');
    });

    it('should provide onChange handler', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      const event = { target: { name: 'name', value: 'Jane' } };

      act(() => {
        result.current.handleChange(event as any);
      });

      expect(result.current.values.name).toBe('Jane');
    });
  });

  describe('touched state', () => {
    it('should mark field as touched on blur', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.handleBlur({ target: { name: 'email' } } as any);
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('should track which fields have been touched', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.setTouched('name', true);
        result.current.setTouched('email', true);
      });

      expect(result.current.touched.name).toBe(true);
      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.age).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate on submit', async () => {
      const validate = vi.fn().mockReturnValue({ email: 'Invalid email' });
      const onSubmit = vi.fn();

      const { result } = renderHook(() => 
        useForm({ initialValues, validate, onSubmit })
      );

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(validate).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.errors.email).toBe('Invalid email');
    });

    it('should call onSubmit when valid', async () => {
      const validate = vi.fn().mockReturnValue({});
      const onSubmit = vi.fn();

      const { result } = renderHook(() => 
        useForm({ 
          initialValues: { name: 'John', email: 'john@example.com', age: 25 },
          validate, 
          onSubmit 
        })
      );

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John', email: 'john@example.com' })
      );
    });

    it('should validate on change when validateOnChange is true', () => {
      const validate = vi.fn().mockReturnValue({ name: 'Too short' });

      const { result } = renderHook(() => 
        useForm({ initialValues, validate, validateOnChange: true })
      );

      act(() => {
        result.current.setValue('name', 'A');
      });

      expect(validate).toHaveBeenCalled();
    });
  });

  describe('form state', () => {
    it('should track isDirty', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setValue('name', 'Changed');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should track isValid', () => {
      const { result } = renderHook(() => 
        useForm({ 
          initialValues,
          validate: (values) => 
            values.name ? {} : { name: 'Required' }
        })
      );

      // Trigger validation
      act(() => {
        result.current.validateForm();
      });

      expect(result.current.isValid).toBe(false);

      act(() => {
        result.current.setValue('name', 'John');
        result.current.validateForm();
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should track isSubmitting', async () => {
      const onSubmit = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => 
        useForm({ initialValues, onSubmit })
      );

      expect(result.current.isSubmitting).toBe(false);

      const submitPromise = act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.isSubmitting).toBe(true);

      await submitPromise;

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial values', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.setValue('name', 'Changed');
        result.current.setError('email', 'Error');
        result.current.setTouched('age', true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
    });

    it('should reset to new values', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      act(() => {
        result.current.reset({ name: 'New', email: 'new@example.com', age: 30 });
      });

      expect(result.current.values.name).toBe('New');
    });
  });

  describe('field registration', () => {
    it('should provide getFieldProps', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      const props = result.current.getFieldProps('name');

      expect(props).toHaveProperty('name', 'name');
      expect(props).toHaveProperty('value', '');
      expect(props).toHaveProperty('onChange');
      expect(props).toHaveProperty('onBlur');
    });
  });
});

describe('useFieldArray Hook', () => {
  const initialValues = { items: [{ name: 'Item 1' }] };

  describe('array operations', () => {
    it('should add items', () => {
      const { result } = renderHook(() => useFieldArray('items', initialValues.items));

      act(() => {
        result.current.append({ name: 'Item 2' });
      });

      expect(result.current.fields).toHaveLength(2);
    });

    it('should remove items', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'A' }, { name: 'B' }, { name: 'C' }])
      );

      act(() => {
        result.current.remove(1);
      });

      expect(result.current.fields).toHaveLength(2);
      expect(result.current.fields[1].name).toBe('C');
    });

    it('should insert items at index', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'A' }, { name: 'C' }])
      );

      act(() => {
        result.current.insert(1, { name: 'B' });
      });

      expect(result.current.fields[1].name).toBe('B');
    });

    it('should swap items', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'A' }, { name: 'B' }])
      );

      act(() => {
        result.current.swap(0, 1);
      });

      expect(result.current.fields[0].name).toBe('B');
      expect(result.current.fields[1].name).toBe('A');
    });

    it('should move items', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'A' }, { name: 'B' }, { name: 'C' }])
      );

      act(() => {
        result.current.move(0, 2);
      });

      expect(result.current.fields.map(f => f.name)).toEqual(['B', 'C', 'A']);
    });

    it('should prepend items', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'B' }])
      );

      act(() => {
        result.current.prepend({ name: 'A' });
      });

      expect(result.current.fields[0].name).toBe('A');
    });

    it('should replace all items', () => {
      const { result } = renderHook(() => 
        useFieldArray('items', [{ name: 'Old' }])
      );

      act(() => {
        result.current.replace([{ name: 'New 1' }, { name: 'New 2' }]);
      });

      expect(result.current.fields).toHaveLength(2);
      expect(result.current.fields[0].name).toBe('New 1');
    });
  });
});

describe('Form Serialization', () => {
  describe('parseFormData', () => {
    it('should parse FormData to object', () => {
      const formData = new FormData();
      formData.append('name', 'John');
      formData.append('email', 'john@example.com');

      const result = parseFormData(formData);

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should handle multiple values as array', () => {
      const formData = new FormData();
      formData.append('tags', 'tag1');
      formData.append('tags', 'tag2');
      formData.append('tags', 'tag3');

      const result = parseFormData(formData);

      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should parse nested field names', () => {
      const formData = new FormData();
      formData.append('user[name]', 'John');
      formData.append('user[email]', 'john@example.com');

      const result = parseFormData(formData);

      expect(result.user).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  describe('serializeForm', () => {
    it('should serialize object to URLSearchParams', () => {
      const data = { name: 'John', age: '30' };
      const result = serializeForm(data);

      expect(result).toBe('name=John&age=30');
    });

    it('should handle arrays', () => {
      const data = { tags: ['a', 'b', 'c'] };
      const result = serializeForm(data);

      expect(result).toContain('tags=a');
      expect(result).toContain('tags=b');
      expect(result).toContain('tags=c');
    });

    it('should encode special characters', () => {
      const data = { query: 'hello world & more' };
      const result = serializeForm(data);

      expect(result).toBe('query=hello%20world%20%26%20more');
    });
  });
});
