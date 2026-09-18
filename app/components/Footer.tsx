export default function Footer() {
  return (
    <footer className="flex w-full items-center justify-center py-6 px-16 bg-white dark:bg-black border-t border-black/[.08] dark:border-white/[.08]">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} Vision Report
      </p>
    </footer>
  );
}
