import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ArrowRight from "@/components/icons/ArrowRight";
import List from "@/components/icons/List";
import Clock from "@/components/icons/Clock";
import Bell from "@/components/icons/Bell";

const features = [
  {
    title: "Find your service",
    description:
      "Browse available services and join the queue that fits your needs.",
    icon: List,
  },
  {
    title: "Know where you stand",
    description:
      "See your position and estimated wait so you can plan your time.",
    icon: Clock,
  },
  {
    title: "Stay in the loop",
    description:
      "Follow queue updates, see when you’re almost ready, and review your history.",
    icon: Bell,
  },
];
export default function Home() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-[56px] dark:text-white">
              Your place in line.
              <br />
              <span className="text-brand-500 dark:text-brand-400">
                Your time, back.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-gray-500 dark:text-gray-400">
              A simpler way to join service queues, follow your wait, and know
              what comes next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register">
                Get started
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/login" variant="outline">
                Log in
              </ButtonLink>
            </div>
          </div>
          <Card className="overflow-hidden shadow-theme-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <h2 className="font-semibold">Your queue, at a glance</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Example
              </span>
            </div>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Service
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    Student services
                  </h3>
                </div>
                <Badge color="warning">Waiting</Badge>
              </div>
              <div className="my-7 grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Queue position
                  </p>
                  <p className="mt-2 text-4xl font-semibold">03</p>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Estimated wait
                  </p>
                  <p className="mt-2 text-4xl font-semibold">
                    15
                    <span className="ml-1.5 text-base font-normal text-gray-500 dark:text-gray-400">
                      min
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <Bell className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-400" />
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Queue updates keep you informed as your turn gets closer.
                </p>
              </div>
            </CardBody>
          </Card>
        </section>
        <section
          id="overview"
          className="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3"
        >
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold">
              Less uncertainty. More clarity.
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              One place to follow your journey, from joining to being served.
            </p>
            <div className="mt-10 grid gap-10 md:grid-cols-3">
              {features.map(({ title, description, icon: Icon }, i) => (
                <article key={title}>
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                    <Icon />
                  </div>
                  <h3 className="text-lg font-semibold">
                    {i + 1}. {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold">
              Keep your services moving.
            </h2>
            <p className="mt-3 leading-7 text-gray-500 dark:text-gray-400">
              QueueSmart also gives administrators a shared workspace to manage
              services, open or close queues, and guide users through their
              turn.
            </p>
          </div>
          <ButtonLink href="/login" variant="outline">
            Administrator login
            <ArrowRight />
          </ButtonLink>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
