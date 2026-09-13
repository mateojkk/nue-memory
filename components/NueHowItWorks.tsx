'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';

export function NueHowItWorks() {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

  const steps = [
    {
      title: 'Add',
      description: 'Input data in seconds with no config or boilerplate.',
      badgeText: '✓ Memory Updated.',
      userMessage: 'Hi! Can you schedule my tomorrow morning for me?',
      agentResponse: 'Scheduled! Blocked 10:00 AM - 1:00 PM for deep work with no interruptions based on your preferences.',
    },
    {
      title: 'Learn',
      description: 'Nue extracts and updates memories autonomously.',
      badgeText: '✓ Long-Term Preference Extracted.',
      userMessage: 'I prefer bright, minimal visuals rather than cluttered layouts.',
      agentResponse: 'Extracted rule: [VISUAL_STYLE] = Minimal, High Brightness. Committed to Walrus agent memory.',
    },
    {
      title: 'Retrieve',
      description: 'Nue retrieves key memories as users interact.',
      badgeText: '✓ Context Injected into Agent.',
      userMessage: 'Generate our new marketing campaign presentation.',
      agentResponse: 'Retrieved 3 persistent preferences from previous sessions. Composing with minimal visuals.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 max-w-7xl mx-auto bg-white border-t border-[#f0f0f0] font-light">
      {/* Section Label & Headline (Exact mem0 Image 4 Layout) */}
      <div className="mb-14 text-left">
        <h3 className="text-xl sm:text-2xl font-medium text-stone-400 mb-2 font-sans">
          How it works
        </h3>
        <h2 className="text-3xl sm:text-5xl font-medium text-[#18120e] tracking-tight font-sans">
          Add anything. Nue learns preferences
        </h2>
      </div>

      {/* Main Stepper Card */}
      <div className="rounded-3xl border border-[#e5e5e5] bg-white p-6 sm:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Vertical Timeline */}
        <div className="lg:col-span-5 space-y-8 relative pl-2">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <div
                key={step.title}
                onClick={() => setActiveStep(idx as 0 | 1 | 2)}
                className="relative flex items-start gap-4 cursor-pointer group select-none"
              >
                {/* Connecting Line between steps */}
                {idx < steps.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-[26px] bottom-[-26px] w-[2px] transition-colors ${
                      activeStep > idx ? 'bg-[#9c4e1f]' : 'bg-stone-200'
                    }`}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 z-10 ${
                    isActive
                      ? 'bg-[#c88d51] text-white shadow-md ring-4 ring-[#f5ece4]'
                      : 'bg-stone-200 text-stone-400 group-hover:bg-stone-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Step Title & Description */}
                <div>
                  <h4
                    className={`text-xl font-medium transition font-sans ${
                      isActive
                        ? 'text-[#18120e]'
                        : 'text-stone-400 group-hover:text-stone-600'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={`text-xs sm:text-sm mt-1 leading-relaxed transition font-light ${
                      isActive ? 'text-[#736357]' : 'text-stone-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Warm Gradient Card */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-gradient-to-br from-[#d49b6a] via-[#a85a2a] to-[#45220f] p-6 sm:p-10 text-white relative overflow-hidden shadow-xl min-h-[320px] flex flex-col justify-center">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

            <div className="opacity-40 text-[11px] font-mono mb-4 text-center font-light">
              ... flat whites, and start deep-work around 10 AM.
            </div>

            <div className="flex items-center justify-between text-xs font-medium mb-4 px-2">
              <span className="inline-flex items-center gap-1.5 text-white/95 font-medium">
                <Check className="w-4 h-4 text-amber-200" />
                <span>{steps[activeStep].badgeText}</span>
              </span>
              <span className="text-white/60 font-mono text-[11px] font-light">Now</span>
            </div>

            <div className="rounded-2xl bg-white text-[#18120e] p-4 sm:p-5 shadow-lg mb-3">
              <p className="text-sm sm:text-base font-medium font-sans">
                {steps[activeStep].userMessage}
              </p>
            </div>

            <div className="rounded-xl bg-black/25 backdrop-blur-md text-white/90 p-3.5 text-xs sm:text-sm border border-white/10 font-light">
              <p>{steps[activeStep].agentResponse}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
