// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* top-left "home" pill */}
      <div className="p-4">
        <button className="rounded-md border px-3 py-1 text-sm shadow-sm hover:bg-gray-50">
          home
        </button>
      </div>

      <main className="mx-auto grid max-w-5xl place-items-center px-6 pb-20 pt-8">
        <section className="flex w-full max-w-3xl flex-col gap-12">
          {/* HOST */}
          <div className="flex items-start gap-8">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border">
              <Image
                src="/host.png"
                alt="Host"
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="relative">
                <div className="absolute -top-4 left-0 text-xs font-medium tracking-widest text-gray-700">
                  HOST
                </div>
                <div className="h-px w-full bg-gray-300" />
              </div>

              <Link
                href="/host"
                className="w-fit rounded-md bg-green-500 px-4 py-2 text-white shadow hover:bg-green-600"
              >
                Create Session
              </Link>
            </div>
          </div>

          {/* JOIN */}
          <div className="flex items-start gap-8">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border">
              <Image
                src="/join.png"
                alt="Join"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="relative">
                <div className="absolute -top-4 left-0 text-xs font-medium tracking-widest text-gray-700">
                  JOIN
                </div>
                <div className="h-px w-full bg-gray-300" />
              </div>

              <form className="flex w-full max-w-md items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter Code"
                  className="w-full rounded-md border px-4 py-2 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  type="submit"
                  aria-label="Join"
                  className="grid h-10 w-14 place-items-center rounded-md border shadow-sm hover:bg-gray-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7-11-7z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
