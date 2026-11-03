interface LogoProps {
  width: number;
  height: number;
}

export default function Logo({ width, height }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="모두의입법"
      className="block shrink-0 bg-[url('/images/logo.svg')] bg-contain bg-center bg-no-repeat dark:bg-[url('/images/logoDark.svg')]"
      style={{ width, height }}
    />
  );
}
