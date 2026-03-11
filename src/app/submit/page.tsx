import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SubmitForm } from "@/components/submit-form";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Submit - Vibe Shit",
};

export default async function SubmitPage() {
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/submit");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold">{t.submitPage.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.submitPage.subtitle}
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
