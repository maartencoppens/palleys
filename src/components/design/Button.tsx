import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";

type ButtonVariant = "orange" | "bare" | "arrow" | "primary" | "secondary";

type CommonButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "default" | "large";
  className?: string;
  loading?: boolean;
  loadingText?: ReactNode;
  disabled?: boolean;
};

type ButtonProps = CommonButtonProps &
  (
    | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
        href?: undefined;
      })
    | (Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
        href: string;
      })
  );

const base =
  "group inline-flex items-center justify-center rounded-pill leading-[19.5px] whitespace-nowrap transition";

const variants = {
  orange: {
    className:
      "h-[60px] gap-2.5 bg-accent-highlights px-9 py-m text-2xl font-bold text-button-primary-text hover:bg-accent-highlights-hover active:scale-[0.98] md:px-2xl md:text-[32px]",
    arrow: { src: "/images/arrow-lg.svg", width: 28.7143, height: 23 },
    arrowHover: "group-hover:translate-x-1",
  },
  bare: {
    className:
      "gap-2.5 px-2xl py-m text-xl font-semibold text-button-primary-text md:text-2xl [&>span]:underline-offset-6 hover:[&>span]:underline",
    arrow: { src: "/images/arrow-sm.svg", width: 19.5, height: 15.5 },
    arrowHover: "group-hover:translate-x-1",
  },
  arrow: {
    className:
      "gap-1 bg-medium-green px-[19px] py-[9px] text-xl font-semibold text-button-primary-text hover:bg-medium-green-hover active:scale-[0.98]",
    arrow: {
      src: "/images/arrow-up-right.svg",
      width: 27.3646,
      height: 27.3646,
    },
    arrowHover: "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
  },
  /* Compact pill, same look as the cart's checkout button. */
  primary: {
    className:
      "bg-orange px-6 py-3 font-label text-base font-semibold text-off-white hover:bg-orange-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
  },
  /* Outlined pill, same look as an unselected chip (ChoiceChips). */
  secondary: {
    className:
      "border-[1.5px] border-medium-green bg-white px-6 py-3 font-label text-base font-semibold text-medium-green hover:bg-off-white disabled:cursor-not-allowed disabled:opacity-60",
  },
} as const;

const orangeHeights = {
  default: "md:h-[68px]",
  large: "md:h-[72px]",
} as const;

function Button(props: ButtonProps) {
  const {
    children,
    variant = "orange",
    size = "default",
    className = "",
    loading = false,
    loadingText = "Bezig…",
  } = props;
  const styles = variants[variant];
  const content = loading ? loadingText : children;
  const heightClassName = variant === "orange" ? orangeHeights[size] : "";
  const classNames = `${base} ${styles.className} ${heightClassName} ${className}`;
  const arrow = "arrow" in styles ? styles.arrow : undefined;
  const arrowHover = "arrowHover" in styles ? styles.arrowHover : "";
  const renderedContent = (
    <>
      <span className="decoration-2">{content}</span>
      {arrow && (
        <Image
          className={`shrink-0 transition-transform ${arrowHover}`}
          src={arrow.src}
          width={arrow.width}
          height={arrow.height}
          alt=""
          aria-hidden
        />
      )}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    const {
      href,
      children: _children,
      variant: _variant,
      size: _size,
      className: _className,
      loading: _loading,
      loadingText: _loadingText,
      disabled,
      ...linkProps
    } = props;
    void [_children, _variant, _size, _className, _loading, _loadingText];

    return (
      <Link
        href={href}
        className={classNames}
        aria-busy={loading || undefined}
        aria-disabled={disabled || undefined}
        {...linkProps}
      >
        {renderedContent}
      </Link>
    );
  }

  const {
    children: _children,
    variant: _variant,
    size: _size,
    className: _className,
    loading: _loading,
    loadingText: _loadingText,
    disabled,
    ...buttonProps
  } = props;
  void [_children, _variant, _size, _className, _loading, _loadingText];

  return (
    <button
      type="button"
      className={classNames}
      disabled={loading || disabled}
      aria-busy={loading}
      {...buttonProps}
    >
      {renderedContent}
    </button>
  );
}

export { Button };
export default Button;
