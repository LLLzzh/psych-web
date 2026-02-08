interface ErrorMessageProps {
  message: string;
  onClose: () => void;
}

export function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  return (
    <div className="flex justify-between items-center mb-5 px-4 py-3 bg-red-100 text-red-800 border border-red-300 rounded">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="bg-transparent border-none text-red-800 cursor-pointer text-base p-0 ml-2.5"
      >
        关闭
      </button>
    </div>
  );
}
