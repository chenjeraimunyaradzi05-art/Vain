/**
 * Form Helpers
 * Utilities for form handling and validation
 */

import { useState, useCallback, useMemo } from 'react';

export type ValidationRule<T> = {
  validate: (value: T, formData?: Record<string, unknown>) => boolean;
  message: string;
};

export type FieldConfig<T = unknown> = {
  initialValue: T;
  rules?: ValidationRule<T>[];
  transform?: (value: T) => T;
};

export type FormConfig<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldConfig<T[K]>;
};

export type FormErrors<T> = {
  [K in keyof T]?: string;
};

export type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

/**
 * Custom hook for form state management
 */
export function useForm<T extends Record<string, unknown>>(config: FormConfig<T>) {
  // Extract initial values
  const initialValues = useMemo(() => {
    const values: Partial<T> = {};
    for (const key in config) {
      values[key] = config[key].initialValue;
    }
    return values as T;
  }, [config]);

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T, value: T[keyof T]): string | undefined => {
      const fieldConfig = config[name];
      if (!fieldConfig.rules) return undefined;

      for (const rule of fieldConfig.rules) {
        if (!rule.validate(value, values)) {
          return rule.message;
        }
      }
      return undefined;
    },
    [config, values]
  );

  // Validate all fields
  const validateForm = useCallback((): FormErrors<T> => {
    const newErrors: FormErrors<T> = {};
    for (const key in config) {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
      }
    }
    return newErrors;
  }, [config, validateField, values]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(validateForm()).length === 0;
  }, [validateForm]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    for (const key in values) {
      if (values[key] !== initialValues[key]) {
        return true;
      }
    }
    return false;
  }, [values, initialValues]);

  // Set field value
  const setValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      const fieldConfig = config[name];
      const transformedValue = fieldConfig.transform
        ? fieldConfig.transform(value)
        : value;

      setValues((prev) => ({ ...prev, [name]: transformedValue }));

      // Validate on change if already touched
      if (touched[name]) {
        const error = validateField(name, transformedValue);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [config, touched, validateField]
  );

  // Handle input change
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value, type } = e.target;
      const inputValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      setValue(name as keyof T, inputValue as T[keyof T]);
    },
    [setValue]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (
      e: React.FocusEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      // Validate on blur
      const error = validateField(name as keyof T, values[name as keyof T]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField, values]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => Promise<void> | void) => {
      return async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitCount((prev) => prev + 1);

        // Touch all fields
        const allTouched: FormTouched<T> = {};
        for (const key in config) {
          allTouched[key] = true;
        }
        setTouched(allTouched);

        // Validate all fields
        const formErrors = validateForm();
        setErrors(formErrors);

        if (Object.keys(formErrors).length === 0) {
          setIsSubmitting(true);
          try {
            await onSubmit(values);
          } finally {
            setIsSubmitting(false);
          }
        }
      };
    },
    [config, validateForm, values]
  );

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitCount(0);
  }, [initialValues]);

  // Set multiple values at once
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Get field props for easy binding
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name: name as string,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      'aria-invalid': !!errors[name],
      'aria-describedby': errors[name] ? `${name as string}-error` : undefined,
    }),
    [values, errors, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    submitCount,
    setValue,
    setMultipleValues,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    reset,
    getFieldProps,
  };
}

// ============================================
// Common Validation Rules
// ============================================

export const rules = {
  required: (message = 'This field is required'): ValidationRule<unknown> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message,
  }),

  email: (message = 'Please enter a valid email'): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  minLength: (
    min: number,
    message?: string
  ): ValidationRule<string | unknown[]> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.length >= min;
      if (Array.isArray(value)) return value.length >= min;
      return true;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (
    max: number,
    message?: string
  ): ValidationRule<string | unknown[]> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.length <= max;
      if (Array.isArray(value)) return value.length <= max;
      return true;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Must be no more than ${max}`,
  }),

  pattern: (
    regex: RegExp,
    message = 'Invalid format'
  ): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message,
  }),

  match: (
    fieldName: string,
    message?: string
  ): ValidationRule<unknown> => ({
    validate: (value, formData) => value === formData?.[fieldName],
    message: message || `Must match ${fieldName}`,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  phone: (
    message = 'Please enter a valid phone number'
  ): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      // Australian phone format
      return /^(\+61|0)[2-478](\d{8}|\d{4}\s\d{4})$/.test(
        value.replace(/\s/g, '')
      );
    },
    message,
  }),

  password: (message?: string): ValidationRule<string> => ({
    validate: (value) => {
      return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value)
      );
    },
    message:
      message ||
      'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),

  custom: <T,>(
    validateFn: (value: T, formData?: Record<string, unknown>) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
};

// ============================================
// Transform Functions
// ============================================

export const transforms = {
  trim: (value: string): string => value.trim(),
  
  lowercase: (value: string): string => value.toLowerCase(),
  
  uppercase: (value: string): string => value.toUpperCase(),
  
  capitalize: (value: string): string =>
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  
  number: (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  },
  
  phone: (value: string): string => {
    // Format Australian phone number
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return value;
  },
};

const formHelpers = {
  useForm,
  rules,
  transforms,
};

export default formHelpers;
