export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) return `${fieldName} is required`;
  return null;
};

export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return 'Phone is required';
  if (phone.length < 10 || !/^[\d\s\-\+\(\)]+$/.test(phone)) return 'Please enter a valid phone number';
  return null;
};

export const validateTime = (time) => {
  if (!time) return 'Time is required';
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return 'Please enter a valid time (HH:MM)';
  return null;
};

export const validateDate = (date) => {
  if (!date) return 'Date is required';
  if (isNaN(new Date(date).getTime())) return 'Please enter a valid date';
  return null;
};

export const validateNumber = (value, fieldName, { min, max } = {}) => {
  if (value === null || value === undefined || value === '') return `${fieldName} is required`;
  const num = parseFloat(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
  if (max !== undefined && num > max) return `${fieldName} must not exceed ${max}`;
  return null;
};

export const validateFormFields = (data, schema) => {
  const errors = {};
  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      return;
    }
    if (rules.validate && value) {
      const error = rules.validate(value);
      if (error) errors[field] = error;
    }
  });
  return Object.keys(errors).length > 0 ? errors : null;
};

export const showFieldError = (fieldName, errors) => errors?.[fieldName] || null;