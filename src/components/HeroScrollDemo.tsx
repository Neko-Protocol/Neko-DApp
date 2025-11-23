"use client";
import { ContainerScroll } from "./ui/container-scroll-animation";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-bold text-black dark:text-white">
              RWAs are meant to be <br />
              <span className="text-5xl md:text-[6rem] text-blue-500 font-bold mt-1 leading-none">
                COOL
              </span>
            </h1>
          </>
        }
      >
        <img
          src={`/dashboard.png`}
          alt="dashboard_demo"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
    </div>
  );
}
