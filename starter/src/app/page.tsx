// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import JoinForm from "../components/JoinForm";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* top-left "home" pill */}
      <div className="absolute left-4 top-4">
        <button className="rounded-md border px-3 py-1 text-sm shadow-sm hover:bg-gray-50 cursor-pointer transform transition duration-150 hover:scale-105 hover:bg-gray-300/90">
          home
        </button>
      </div>

      {/* center the content vertically & horizontally */}
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6">
        <section className="flex w-full max-w-4xl flex-col gap-10 md:gap-12">
          {/* HOST card */}
          <div className="flex items-center gap-8 rounded-2xl border bg-white p-6 shadow-sm md:gap-10 md:p-8">
            {/* big circle image */}
            <div className="relative h-36 w-36 overflow-hidden rounded-full border md:h-40 md:w-40">
              <Image
                src="/host-placeholder.png"
                alt="Host"
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex w-full flex-col gap-5 md:gap-6">
              {/* label + rule */}
              <div className="relative w-full">
                <span className="absolute -top-4 left-0 text-xs font-semibold tracking-[0.2em] text-gray-700">
                  HOST
                </span>
                <div className="h-px w-full bg-gray-300" />
              </div>

              <Link
                href="/host"
                className="self-start rounded-lg bg-blue-500 px-6 py-3 text-base font-medium text-white shadow hover:bg-blue-600 md:text-lg transform transition duration-150 hover:scale-105 hover:bg-blue-400/90"
              >
                Create Session
              </Link>
            </div>
          </div>

          {/* JOIN card */}
          <div className="flex items-center gap-8 rounded-2xl border bg-white p-6 shadow-sm md:gap-10 md:p-8">
            <div className="relative h-36 w-36 overflow-hidden rounded-full border md:h-40 md:w-40">
              <Image src="/join-placeholder.png" alt="Join" fill className="object-cover" />
            </div>

            <div className="flex w-full flex-col gap-5 md:gap-6">
              <div className="relative w-full">
                <span className="absolute -top-4 left-0 text-xs font-semibold tracking-[0.2em] text-gray-700">
                  JOIN
                </span>
                <div className="h-px w-full bg-gray-300" />
              </div>

              <JoinForm />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
