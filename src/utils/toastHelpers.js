import { toast } from "sonner";

/**
 * Shows a success toast notification that auto-dismisses after 3 seconds
 * @param {string} message - Success message to display
 */
export function showSuccess(message) {
  toast.success(message, {
    duration: 3000,
    position: "top-right",
  });
}

/**
 * Shows an error toast notification that auto-dismisses after 5 seconds
 * @param {string} message - Error message to display
 * @param {string} [details] - Optional error details
 */
export function showError(message, details) {
  toast.error(details ? `${message}: ${details}` : message, {
    duration: 5000,
    position: "top-right",
  });
}

/**
 * Shows a loading toast notification
 * @param {string} message - Loading message to display
 * @returns {string} Toast ID for dismissing
 */
export function showLoading(message) {
  return toast.loading(message, {
    position: "top-right",
  });
}

/**
 * Shows a confirmation toast for delete operations
 * @param {Function} onConfirm - Function to call when confirmed
 * @param {string} [itemName] - Name of item being deleted
 */
export function showDeleteConfirm(onConfirm, itemName = "item") {
  toast.warning(`Delete ${itemName}?`, {
    description: "This action cannot be undone",
    position: "top-right",
    duration: 5000,
    action: {
      label: "Delete",
      onClick: () => onConfirm(),
      className: "bg-red-600 text-white hover:bg-red-700",
    },
  });
}

/**
 * Wraps a mutation with standard success/error toast handling
 * @param {Function} mutationFn - The mutation function to execute
 * @param {string} successMessage - Message to show on success
 * @param {string} errorMessage - Message to show on error
 * @param {Function} [onSuccess] - Optional callback after success
 */
export function withToast(mutationFn, successMessage, errorMessage = "Operation failed", onSuccess) {
  return async (...args) => {
    try {
      const result = await mutationFn(...args);
      showSuccess(successMessage);
      onSuccess?.(result);
      return result;
    } catch (error) {
      showError(errorMessage, error.message);
      throw error;
    }
  };
}