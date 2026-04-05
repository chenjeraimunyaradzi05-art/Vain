'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

type FormValue = string | number | boolean | null | undefined;
type FormValues = Record<string, FormValue>;
type FormErrors = Record<string, string | undefined>;
type FormTouched = Record<string, boolean>;

interface ValidationRule<T = FormValue> {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: T, allValues: FormValues) => string | undefined | true;
}

type ValidationRules<T extends FormValues> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

interface UseFormOptions<T extends FormValues> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T extends FormValues> {
  values: T;
  errors: FormErrors;
  touched: FormTouched;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  setValue: (name: keyof T, value: FormValue) => void;
  setValues: (values: Partial<T>) => void;
  setError: (name: keyof T, error: string) => void;
  clearError: (name: keyof T) => void;
  clearErrors: () => void;
  reset: () => void;
  validate: () => boolean;
  getFieldProps: (name: keyof T) => {
    name: string;
    value: FormValue;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  };
}

function validateField<T extends FormValues>(
  value: FormValue,
  rule: ValidationRule<FormValue> | undefined,
  allValues: T
): string | undefined {
  if (!rule) return undefined;

  // Required validation
  if (rule.required) {
    const isEmpty = value === undefined || value === null || value === '';
    if (isEmpty) {
      return typeof rule.required === 'string' ? rule.required : 'This field is required';
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength.value) {
      return rule.minLength.message;
    }
    if (rule.maxLength && value.length > rule.maxLength.value) {
      return rule.maxLength.message;
    }
    if (rule.pattern && !rule.pattern.value.test(value)) {
      return rule.pattern.message;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min.value) {
      return rule.min.message;
    }
    if (rule.max !== undefined && value > rule.max.value) {
      return rule.max.message;
    }
  }

  // Custom validation
  if (rule.validate) {
    const result = rule.validate(value, allValues);
    if (typeof result === 'string') {
      return result;
    }
  }

  return undefined;
}

export function useForm<T extends FormValues>({
  initialValues,
  validationRules,
  validateOnChange = false,
  validateOnBlur = true,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValuesRef = useRef(initialValues);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  const isValid = Object.keys(errors).length === 0;

  const validateAll = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (validationRules) {
      for (const [field, rule] of Object.entries(validationRules)) {
        const error = validateField(values[field], rule, values);
        if (error) {
          newErrors[field] = error;
        }
      }
    }
    
    return newErrors;
  }, [values, validationRules]);

  const validate = useCallback((): boolean => {
    const newErrors = validateAll();
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateAll]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : type === 'number' 
        ? parseFloat(value) || value
        : value;

    setValuesState(prev => ({ ...prev, [name]: newValue }));

    if (validateOnChange && validationRules?.[name]) {
      const error = validateField(newValue, validationRules[name] as ValidationRule<FormValue>, { ...values, [name]: newValue });
      setErrors(prev => {
        if (error) {
          return { ...prev, [name]: error };
        }
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [validateOnChange, validationRules, values]);

  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur && validationRules?.[name]) {
      const error = validateField(values[name], validationRules[name] as ValidationRule<FormValue>, values);
      setErrors(prev => {
        if (error) {
          return { ...prev, [name]: error };
        }
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [validateOnBlur, validationRules, values]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Mark all fields as touched
    const allTouched: FormTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const newErrors = validateAll();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validateAll, onSubmit]);

  const setValue = useCallback((name: keyof T, value: FormValue) => {
    setValuesState(prev => ({ ...prev, [name]: value }));
  }, []);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name as string]: error }));
  }, []);

  const clearError = useCallback((name: keyof T) => {
    setErrors(prev => {
      const { [name as string]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValuesRef.current);
    setErrors({});
    setTouched({});
  }, []);

  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
  }), [values, handleChange, handleBlur]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    reset,
    validate,
    getFieldProps,
  };
}

// Common validation patterns
export const validationPatterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  phone: /^(\+?\d{1,3}[- ]?)?\d{10}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  postcode: /^\d{4}$/,  // Australian postcode
  abn: /^\d{11}$/,      // Australian Business Number
};

// Common validation helpers
export const validators = {
  email: (value: string) => 
    validationPatterns.email.test(value) ? undefined : 'Please enter a valid email address',
  phone: (value: string) => 
    validationPatterns.phone.test(value) ? undefined : 'Please enter a valid phone number',
  url: (value: string) => 
    validationPatterns.url.test(value) ? undefined : 'Please enter a valid URL',
  postcode: (value: string) => 
    validationPatterns.postcode.test(value) ? undefined : 'Please enter a valid postcode',
  passwordStrength: (value: string) => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return undefined;
  },
  confirmPassword: (value: string, allValues: FormValues) => 
    value === allValues.password ? undefined : 'Passwords do not match',
};

export default useForm;
