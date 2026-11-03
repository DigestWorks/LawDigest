interface SectionContainerProps {
  title?: string;
  children: React.ReactNode;
}

export default function SectionContainer({ title, children }: SectionContainerProps) {
  return (
    <section className="flex flex-col gap-6">
      {title && <h2 className="text-2xl font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
