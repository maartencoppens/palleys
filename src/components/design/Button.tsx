import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function Button({
  loading = false,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type="button"
      disabled={loading || props.disabled}
      onClick={onClick}
      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
    >
      {loading ? "Loading..." : "Button"}
    </button>
  );
}
