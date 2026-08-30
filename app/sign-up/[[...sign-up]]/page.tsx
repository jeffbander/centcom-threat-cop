import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { CLEARANCE_ATTESTATION } from "@/lib/clearanceNotice";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ticket = params.__clerk_ticket ?? params.__clerk_invitation;
  const invited = typeof ticket === "string" ? ticket.length > 0 : false;
  if (!invited) redirect("/waitlist");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6 bg-[#071018]">
      <section className="w-full max-w-md border border-[#3d4a58] bg-[#0a121a] p-4 text-sm text-[#c5cdd6]">
        <h1 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[#c9a227] mb-2">
          {CLEARANCE_ATTESTATION.title}
        </h1>
        <p className="mb-2 leading-relaxed">{CLEARANCE_ATTESTATION.lead}</p>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          {CLEARANCE_ATTESTATION.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <SignUp />
    </div>
  );
}
