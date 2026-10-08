import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Automate Stack | DFY Contextual DM Engines</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="logo.png">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&family=Poppins:wght@700&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'primary-dark': '#1A1110',
                        'neutral-light': '#FBF9F4',
                        'accent-bronze': '#C8996C',
                        'muted-stone': '#746C61',
                    },
                    fontFamily: {
                        poppins:  ['Poppins', 'sans-serif'],
                        display:  ['"Libre Baskerville"', 'Georgia', 'serif'],
                        body:     ['Lato', 'sans-serif'],
                        lato:     ['Lato', 'sans-serif'],
                        sans:     ['Lato', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        ::selection { background-color: #C8996C; color: #1A1110; }
        html { scroll-behavior: smooth; }
        .accent-border { border-color: #C8996C; }
    </style>
</head>
<body class="font-lato antialiased flex flex-col min-h-screen bg-neutral-light text-primary-dark">

    <!-- Header -->
    <header class="w-full border-b border-muted-stone/20 bg-primary-dark text-neutral-light sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex justify-between items-center">
            <a href="#" class="flex items-center gap-3 shrink-0">
                <img src="logo.png" alt="The Automate Stack Logo" class="h-9 w-auto object-contain" onerror="this.style.display='none'">
                <span class="font-poppins font-bold tracking-widest text-lg md:text-xl lowercase">theautomatestack</span>
            </a>
            
            <nav class="hidden lg:flex items-center gap-8 font-lato text-sm tracking-wide text-neutral-light/80">
                <a href="#problem" class="hover:text-accent-bronze transition-colors">The Problem</a>
                <a href="#infrastructure" class="hover:text-accent-bronze transition-colors">How It Works</a>
                <a href="#infrastructure" class="hover:text-accent-bronze transition-colors">Infrastructure</a>
                <a href="#demo" class="hover:text-accent-bronze transition-colors">Live Demo</a>
            </nav>

            <div class="flex items-center">
                <a href="https://ig.me/m/theautomatestack" target="_blank" class="hidden md:inline-block bg-accent-bronze text-primary-dark font-lato font-bold text-xs uppercase tracking-widest py-3 px-6 rounded hover:opacity-90 transition-opacity">
                    Test Live in DM
                </a>
            </div>
        </div>
    </header>

    <main class="flex-grow">

        <!-- ===================== HERO ===================== -->
        <section class="bg-primary-dark text-neutral-light pt-20 pb-24 md:pt-32 md:pb-32 relative overflow-hidden">
            <!-- Background glow -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-accent-bronze/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div class="max-w-5xl mx-auto px-6 lg:px-12 text-center relative z-10">
                <h1 class="font-display font-bold tracking-tight text-4xl md:text-5xl lg:text-7xl leading-[1.1] mb-8">
                    What happens to your paid ad spend when you fall asleep at <span class="text-accent-bronze italic">11 PM?</span>
                </h1>

                <p class="font-lato text-base md:text-xl leading-relaxed text-neutral-light/80 max-w-3xl mx-auto mb-12">
                    Meta does not pause your budget when your phone battery dies or when power goes out. We build custom, cloud-hosted DM engines that answer complex buyer questions, overcome objections, and send checkout links in 4 seconds. <strong class="text-neutral-light font-bold">No keyword buttons. No manual fatigue.</strong>
                </p>

                <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                    <a href="https://ig.me/m/theautomatestack" target="_blank" class="w-full sm:w-auto bg-accent-bronze text-primary-dark font-lato font-bold text-sm md:text-base uppercase tracking-wide py-4 px-8 rounded hover:opacity-90 transition-all shadow-[0_0_20px_rgba(200,153,108,0.2)] hover:shadow-[0_0_30px_rgba(200,153,108,0.4)] hover:-translate-y-0.5">
                        Test the Engine Live on Instagram &rarr;
                    </a>
                    <a href="#book" class="w-full sm:w-auto bg-transparent border-2 border-accent-bronze text-accent-bronze font-lato font-bold text-sm md:text-base uppercase tracking-wide py-4 px-8 rounded hover:bg-accent-bronze/10 transition-colors">
                        Book a 15-Min Walkthrough
                    </a>
                </div>

                <!-- Social Proof Strip -->
                <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs md:text-sm font-lato text-neutral-light/60 uppercase tracking-widest font-bold">
                    <span class="flex items-center gap-2"><span class="text-accent-bronze">⚡</span> &lt;5s Response Time</span>
                    <span class="hidden sm:inline">&middot;</span>
                    <span class="flex items-center gap-2"><span class="text-accent-bronze">🔋</span> 99.9% Cloud Uptime</span>
                    <span class="hidden md:inline">&middot;</span>
                    <span class="flex items-center gap-2"><span class="text-accent-bronze">🧠</span> Zero Button Menus</span>
                    <span class="hidden sm:inline">&middot;</span>
                    <span class="flex items-center gap-2"><span class="text-accent-bronze">💳</span> Direct Checkout Routing</span>
                </div>
            </div>
        </section>

        <!-- ===================== THE PROBLEM ===================== -->
        <section id="problem" class="bg-neutral-light text-primary-dark py-24 md:py-32 border-b border-muted-stone/15">
            <div class="max-w-7xl mx-auto px-6 lg:px-12">
                <div class="mb-16">
                    <span class="inline-flex items-center gap-2 text-accent-bronze font-lato font-bold text-xs uppercase tracking-widest mb-4">
                        <span class="block w-8 h-px bg-accent-bronze"></span>
                        01 / The Midnight Leak
                    </span>
                    <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight max-w-3xl">
                        Your Meta ads are running. Your response time is killing your return on spend.
                    </h2>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Card 1 -->
                    <div class="bg-white p-8 rounded-xl border border-muted-stone/10 shadow-sm hover:shadow-md transition-shadow">
                        <h3 class="font-display font-bold text-xl mb-4 text-primary-dark">The Midnight Dropout</h3>
                        <p class="font-lato text-muted-stone leading-relaxed">
                            Peak browsing time for high-intent buyers is between 9:30 PM and 1:00 AM. When a lead asks for a bank account or delivery options and waits until sunrise for a reply, <strong class="text-primary-dark">70% buy from a faster competitor.</strong>
                        </p>
                    </div>
                    <!-- Card 2 -->
                    <div class="bg-white p-8 rounded-xl border border-muted-stone/10 shadow-sm hover:shadow-md transition-shadow">
                        <h3 class="font-display font-bold text-xl mb-4 text-primary-dark">The ManyChat Button Trap</h3>
                        <p class="font-lato text-muted-stone leading-relaxed">
                            Rigid keyword triggers break the second a lead writes a typo, slang, or a normal sentence. Forcing serious buyers to tap numbered menus creates drop-off and frustrates customers.
                        </p>
                    </div>
                    <!-- Card 3 -->
                    <div class="bg-white p-8 rounded-xl border border-muted-stone/10 shadow-sm hover:shadow-md transition-shadow">
                        <h3 class="font-display font-bold text-xl mb-4 text-primary-dark">Device & Power Fragility</h3>
                        <p class="font-lato text-muted-stone leading-relaxed">
                            If your customer communication lives on your physical phone, you depend on battery life and mobile network. When power drops, your sales pipeline goes dark while ad spend keeps charging.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===================== THE ARCHITECTURE ===================== -->
        <section id="infrastructure" class="bg-primary-dark text-neutral-light py-24 md:py-32 border-b border-muted-stone/15 relative">
            <div class="max-w-7xl mx-auto px-6 lg:px-12">
                <div class="mb-16 md:text-right">
                    <span class="inline-flex items-center gap-2 md:justify-end text-accent-bronze font-lato font-bold text-xs uppercase tracking-widest mb-4 w-full">
                        <span class="block w-8 h-px bg-accent-bronze md:hidden"></span>
                        02 / The Architecture
                        <span class="hidden md:block w-8 h-px bg-accent-bronze"></span>
                    </span>
                    <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight max-w-3xl md:ml-auto">
                        Not an app. A dedicated cloud response engine.
                    </h2>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Pillar 1 -->
                    <div class="border border-accent-bronze/20 bg-neutral-light/5 p-8 rounded-xl">
                        <div class="text-3xl mb-4">☁️</div>
                        <h3 class="font-display font-bold text-xl mb-4 text-accent-bronze">24/7 Isolated Cloud Hosting</h3>
                        <p class="font-lato text-neutral-light/70 leading-relaxed">
                            Your backend runs on dedicated cloud containers. It stays active 24 hours a day, 7 days a week, regardless of phone battery, generator status, or SIM card network.
                        </p>
                    </div>
                    <!-- Pillar 2 -->
                    <div class="border border-accent-bronze/20 bg-neutral-light/5 p-8 rounded-xl">
                        <div class="text-3xl mb-4">🧠</div>
                        <h3 class="font-display font-bold text-xl mb-4 text-accent-bronze">Natural Context & Typo Handling</h3>
                        <p class="font-lato text-neutral-light/70 leading-relaxed">
                            Powered by smart contextual logic. It understands broken sentences, local slang, and specific product questions. It delivers the right answer and checkout link without making the user click buttons.
                        </p>
                    </div>
                    <!-- Pillar 3 -->
                    <div class="border border-accent-bronze/20 bg-neutral-light/5 p-8 rounded-xl">
                        <div class="text-3xl mb-4">🗄️</div>
                        <h3 class="font-display font-bold text-xl mb-4 text-accent-bronze">Owned Lead Capture & Routing</h3>
                        <p class="font-lato text-neutral-light/70 leading-relaxed">
                            The system collects customer contact details into your private database before sending checkout links. If a card payment fails on Paystack, it instantly routes verified business transfer details to save the sale.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===================== THE COMPARISON ===================== -->
        <section class="bg-neutral-light text-primary-dark py-24 md:py-32 border-b border-muted-stone/15">
            <div class="max-w-6xl mx-auto px-6 lg:px-12">
                <div class="mb-16 text-center">
                    <span class="inline-flex items-center gap-2 text-accent-bronze font-lato font-bold text-xs uppercase tracking-widest mb-4">
                        <span class="block w-8 h-px bg-accent-bronze"></span>
                        03 / The Comparison
                        <span class="block w-8 h-px bg-accent-bronze"></span>
                    </span>
                    <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight max-w-3xl mx-auto">
                        Traditional workarounds vs. The Automate Stack standard.
                    </h2>
                </div>

                <div class="overflow-x-auto rounded-xl border border-muted-stone/20 shadow-sm bg-white">
                    <table class="w-full text-left font-lato min-w-[800px]">
                        <thead>
                            <tr class="border-b border-muted-stone/20 bg-primary-dark text-neutral-light">
                                <th class="p-6 font-display font-bold text-lg w-1/4">Feature</th>
                                <th class="p-6 font-display font-bold text-lg text-neutral-light/60 w-1/4 border-l border-muted-stone/20">Human Social Media Intern</th>
                                <th class="p-6 font-display font-bold text-lg text-neutral-light/60 w-1/4 border-l border-muted-stone/20">Standard ManyChat Setup</th>
                                <th class="p-6 font-display font-bold text-lg text-accent-bronze w-1/4 border-l border-muted-stone/20">The Automate Stack Engine</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-muted-stone/10 text-muted-stone">
                            <tr>
                                <td class="p-6 font-bold text-primary-dark">Response Speed</td>
                                <td class="p-6 border-l border-muted-stone/10">15 mins to 8 hours</td>
                                <td class="p-6 border-l border-muted-stone/10">2 seconds (rigid)</td>
                                <td class="p-6 border-l border-muted-stone/10 font-bold text-primary-dark bg-accent-bronze/10">Under 5 seconds (contextual)</td>
                            </tr>
                            <tr>
                                <td class="p-6 font-bold text-primary-dark">Night & Blackout Uptime</td>
                                <td class="p-6 border-l border-muted-stone/10">Offline when asleep</td>
                                <td class="p-6 border-l border-muted-stone/10">Runs on platform limits</td>
                                <td class="p-6 border-l border-muted-stone/10 font-bold text-primary-dark bg-accent-bronze/10">99.9% independent cloud uptime</td>
                            </tr>
                            <tr>
                                <td class="p-6 font-bold text-primary-dark">Handling Typos & Slang</td>
                                <td class="p-6 border-l border-muted-stone/10">Yes, but gets fatigued</td>
                                <td class="p-6 border-l border-muted-stone/10">Fails; throws error menus</td>
                                <td class="p-6 border-l border-muted-stone/10 font-bold text-primary-dark bg-accent-bronze/10">Understands context naturally</td>
                            </tr>
                            <tr>
                                <td class="p-6 font-bold text-primary-dark">Lead Capture</td>
                                <td class="p-6 border-l border-muted-stone/10">Manual and inconsistent</td>
                                <td class="p-6 border-l border-muted-stone/10">Basic tagging</td>
                                <td class="p-6 border-l border-muted-stone/10 font-bold text-primary-dark bg-accent-bronze/10">Automatic database sync</td>
                            </tr>
                            <tr>
                                <td class="p-6 font-bold text-primary-dark">Cost Efficiency</td>
                                <td class="p-6 border-l border-muted-stone/10">Monthly recurring salary</td>
                                <td class="p-6 border-l border-muted-stone/10">Keyword limits and tiers</td>
                                <td class="p-6 border-l border-muted-stone/10 font-bold text-primary-dark bg-accent-bronze/10">One-time build + minimal server fee</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- ===================== LIVE DEMO ===================== -->
        <section id="demo" class="bg-primary-dark text-neutral-light py-24 md:py-32 border-b border-muted-stone/15">
            <div class="max-w-5xl mx-auto px-6 lg:px-12 text-center">
                <span class="inline-flex items-center gap-2 justify-center text-accent-bronze font-lato font-bold text-xs uppercase tracking-widest mb-4 w-full">
                    <span class="block w-8 h-px bg-accent-bronze"></span>
                    04 / Verify Before You Hire
                    <span class="block w-8 h-px bg-accent-bronze"></span>
                </span>
                <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight max-w-3xl mx-auto mb-6">
                    Do not take our word for it. Stress-test our inbox right now.
                </h2>
                <p class="font-lato text-neutral-light/70 text-lg leading-relaxed max-w-2xl mx-auto mb-16">
                    Send an unstructured, messy question to our Instagram page. Ask about pricing, installments, or delivery logistics. Watch how the engine responds in 4 seconds.
                </p>

                <!-- Mock DM Box -->
                <div class="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-left mb-12 shadow-2xl relative">
                    <div class="absolute -top-4 -right-4 bg-accent-bronze text-primary-dark text-xs font-bold uppercase tracking-widest py-1 px-3 rounded shadow-lg transform rotate-3 z-10">Live Simulation</div>
                    
                    <!-- User Message -->
                    <div class="flex flex-col items-end mb-6">
                        <span class="text-[10px] text-neutral-light/40 mb-1 font-lato uppercase tracking-wider">User</span>
                        <div class="bg-accent-bronze text-primary-dark rounded-2xl rounded-tr-sm p-4 max-w-[85%] font-lato shadow-sm font-medium">
                            "Hey, saw the ad. Can I pay half now and balance next week, and does this work without a laptop?"
                        </div>
                    </div>
                    
                    <!-- Engine Response -->
                    <div class="flex flex-col items-start mt-8">
                        <span class="text-[10px] text-neutral-light/40 mb-1 font-lato uppercase tracking-wider flex items-center gap-2">The Automate Stack <span class="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[9px] lowercase">&lt; 4s latency</span></span>
                        <div class="bg-white/10 text-neutral-light border border-white/10 rounded-2xl rounded-tl-sm p-4 max-w-[95%] font-lato leading-relaxed shadow-sm">
                            "Yes, we support structured split setups for cohorts. The entire engine runs on independent cloud containers, so you do not need a laptop running to keep it active. Here is our direct onboarding breakdown: [Link]"
                        </div>
                    </div>
                </div>

                <a href="https://ig.me/m/theautomatestack" target="_blank" class="inline-block bg-accent-bronze text-primary-dark font-lato font-bold text-sm md:text-base uppercase tracking-wide py-5 px-10 rounded hover:opacity-90 transition-all shadow-[0_0_30px_rgba(200,153,108,0.25)] hover:shadow-[0_0_40px_rgba(200,153,108,0.4)] hover:-translate-y-0.5">
                    Open Instagram & Test Live ────>
                </a>
            </div>
        </section>

        <!-- ===================== THE DELIVERABLE ===================== -->
        <section class="bg-neutral-light text-primary-dark py-24 md:py-32">
            <div class="max-w-4xl mx-auto px-6 lg:px-12">
                <div class="mb-12">
                    <span class="inline-flex items-center gap-2 text-accent-bronze font-lato font-bold text-xs uppercase tracking-widest mb-4">
                        <span class="block w-8 h-px bg-accent-bronze"></span>
                        05 / The Deliverable
                    </span>
                    <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight">
                        Full setup. Zero technical headaches for your team.
                    </h2>
                </div>

                <div class="space-y-6">
                    <!-- Scope Item -->
                    <div class="flex flex-col md:flex-row items-start gap-4 p-6 md:p-8 bg-white border border-muted-stone/10 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-accent-bronze/10 p-3 rounded-lg text-accent-bronze shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        </div>
                        <div>
                            <h4 class="font-display font-bold text-xl text-primary-dark mb-2">Custom Workflow Architecture</h4>
                            <p class="font-lato text-muted-stone leading-relaxed">Complete backend integration tailored to your specific product catalog, courses, or payment options.</p>
                        </div>
                    </div>
                    
                    <!-- Scope Item -->
                    <div class="flex flex-col md:flex-row items-start gap-4 p-6 md:p-8 bg-white border border-muted-stone/10 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-accent-bronze/10 p-3 rounded-lg text-accent-bronze shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div>
                            <h4 class="font-display font-bold text-xl text-primary-dark mb-2">Fail-Safe Logic</h4>
                            <p class="font-lato text-muted-stone leading-relaxed">Automatic fallback triggers for bank transfers, human escalation alerts, and lead capture logging.</p>
                        </div>
                    </div>

                    <!-- Scope Item -->
                    <div class="flex flex-col md:flex-row items-start gap-4 p-6 md:p-8 bg-white border border-muted-stone/10 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-accent-bronze/10 p-3 rounded-lg text-accent-bronze shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
                        </div>
                        <div>
                            <h4 class="font-display font-bold text-xl text-primary-dark mb-2">Private Cloud Deployment</h4>
                            <p class="font-lato text-muted-stone leading-relaxed">Hosted on dedicated, low-cost server infrastructure that you own directly.</p>
                        </div>
                    </div>

                    <!-- Scope Item -->
                    <div class="flex flex-col md:flex-row items-start gap-4 p-6 md:p-8 bg-white border border-muted-stone/10 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-accent-bronze/10 p-3 rounded-lg text-accent-bronze shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                        <div>
                            <h4 class="font-display font-bold text-xl text-primary-dark mb-2">Stress Testing</h4>
                            <p class="font-lato text-muted-stone leading-relaxed">Full simulation testing against messy inputs, typos, and high-volume edge cases before ad traffic turns on.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <!-- ===================== FINAL CTA & FOOTER ===================== -->
    <footer class="bg-primary-dark text-neutral-light pt-24 pb-12 border-t border-accent-bronze/30 relative">
        <div class="max-w-4xl mx-auto px-6 lg:px-12 text-center mb-16 relative z-10">
            <h2 class="font-display font-bold tracking-tight text-3xl md:text-5xl leading-tight mb-6">
                Stop letting late-night inboxes drain your ad budget.
            </h2>
            <p class="font-lato text-neutral-light/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                Preparing for Black Friday campaigns or scaling monthly ad spend? Secure your backend before your next traffic rush.
            </p>
            
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#book" class="w-full sm:w-auto bg-accent-bronze text-primary-dark font-lato font-bold text-sm md:text-base uppercase tracking-wide py-4 px-10 rounded hover:opacity-90 transition-all shadow-[0_0_20px_rgba(200,153,108,0.2)] hover:shadow-[0_0_30px_rgba(200,153,108,0.4)] hover:-translate-y-0.5">
                    Deploy Your DM Engine
                </a>
                <a href="https://ig.me/m/theautomatestack" target="_blank" class="w-full sm:w-auto bg-transparent border-2 border-neutral-light/20 text-neutral-light font-lato font-bold text-sm md:text-base uppercase tracking-wide py-4 px-10 rounded hover:bg-neutral-light/10 transition-colors">
                    Chat with Us on Instagram
                </a>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-6 lg:px-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="font-lato text-sm text-neutral-light/40">
                &copy; <span id="current-year"></span> The Automate Stack. All rights reserved.
            </p>
            <p class="font-poppins font-bold text-sm text-neutral-light/20 uppercase tracking-widest">
                Built for serious operators.
            </p>
        </div>
    </footer>

    <script>
        document.getElementById('current-year').textContent = new Date().getFullYear();
    </script>
</body>
</html>"""

with open(os.path.join("c:/Users/Chinenye/.vscode/projects-ui/theautomatestack", "index.html"), "w", encoding="utf-8") as f:
    f.write(html_content)
