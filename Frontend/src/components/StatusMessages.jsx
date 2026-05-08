export function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="loading-container" role="status" aria-live="polite" aria-atomic="true">
      <div className="spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-container" role="alert" aria-live="assertive" aria-atomic="true">
      <span className="error-icon">⚠</span>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}