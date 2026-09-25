const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[20px] font-semibold mt-[32px] mb-[12px]">{children}</h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[14px] leading-[22px] mb-[12px] opacity-90">{children}</p>
);

const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-[20px] mb-[12px] space-y-[4px] text-[14px] leading-[22px] opacity-90">
    {children}
  </ul>
);

export default function TermsOfServicePage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold mb-[8px]">Terms of Service</h1>
      <P>Last updated: 17 September 2026</P>

      <P>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of
        SocioBird (the &quot;Service&quot;), a social media scheduling and
        management platform operated as an individual business based in India
        (&quot;SocioBird&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an
        account or using the Service, you agree to these Terms and to our{' '}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        . If you do not agree, do not use the Service.
      </P>

      <H2>1. Eligibility and accounts</H2>
      <P>
        You must be at least 18 years old to use the Service. You are responsible
        for the accuracy of the information you provide and for keeping your
        account credentials confidential. You are responsible for all activity that
        happens under your account and any organization you administer, including
        activity by teammates you invite.
      </P>

      <H2>2. The Service</H2>
      <P>
        The Service lets you schedule and publish posts to connected social and
        messaging channels, view analytics, manage a media library, use AI-assisted
        content tools, and collaborate with a team inside an organization. We may
        add, change, or remove features at any time, including features that depend
        on third-party platforms outside our control.
      </P>

      <H2>3. Subscriptions, fees, and billing</H2>
      <P>
        Some features require a paid subscription. Subscriptions renew
        automatically for successive billing periods until cancelled. Payments are
        processed by Razorpay or Stripe for web subscriptions, and by the Apple App
        Store or Google Play (via RevenueCat) for mobile in-app purchases; we never
        collect or store your full payment card number. Fees are shown before you
        subscribe and are, except where required otherwise by law, non-refundable
        once a billing period has started. A new-user discount, where offered,
        applies only to the first billing cycle of eligible plans and is subject to
        change or withdrawal at any time. Lifetime-plan purchases are one-time
        payments for the plan and terms described at the time of purchase, and do
        not include future major-tier upgrades unless stated otherwise. We may
        change our prices; we will give you reasonable notice before a price change
        takes effect on your next renewal, and continued use after that date
        constitutes acceptance of the new price.
      </P>

      <H2>4. Free plans, trials, and beta features</H2>
      <P>
        Free plans, trials, and features marked as beta or experimental are
        provided on an &quot;as-is&quot; basis and may change or be withdrawn at any
        time without notice.
      </P>

      <H2>5. Your content</H2>
      <P>
        You retain all ownership rights in the content you upload or create through
        the Service. By submitting content, you grant us a limited, worldwide,
        royalty-free license to host, store, transmit, and display that content
        solely for the purpose of operating and providing the Service to you
        (including sending it to the third-party platforms you connect and, where
        you use them, AI-assistance providers). You are solely responsible for
        making sure you have the rights to any content you post.
      </P>

      <H2>6. Acceptable use</H2>
      <P>You agree not to use the Service to:</P>
      <Ul>
        <li>Violate any applicable law or the terms of service of a platform you connect;</li>
        <li>Post spam, malware, or content that infringes someone else's rights;</li>
        <li>Attempt to gain unauthorized access to the Service or other users' accounts or data;</li>
        <li>Reverse-engineer, scrape, or interfere with the Service's normal operation; or</li>
        <li>Resell or provide the Service to third parties without our written consent.</li>
      </Ul>
      <P>
        We may suspend or remove content, or suspend or terminate accounts, that
        violate this section.
      </P>

      <H2>7. Third-party platforms and integrations</H2>
      <P>
        Connecting a channel (X, LinkedIn, Instagram, Facebook, TikTok, YouTube,
        Reddit, Pinterest, Discord, Slack, Mastodon, Bluesky, Threads, Farcaster,
        Telegram, or any other supported platform) requires you to authenticate
        with that platform via OAuth or an API key. Your use of each connected
        platform remains subject to that platform's own terms of service. We are
        not responsible for changes, outages, rate limits, or policy enforcement
        actions on the part of any third-party platform, including account
        suspensions caused by your use of that platform.
      </P>

      <H2>8. AI features</H2>
      <P>
        Where the Service offers AI-assisted content, image, or video generation,
        the output is produced by third-party AI model providers and may be
        inaccurate, unsuitable, or infringing. You are solely responsible for
        reviewing any AI-generated content before you publish it. AI video
        generation is disabled by default and is only available where an
        administrator of this instance has explicitly enabled it.
      </P>

      <H2>9. Intellectual property</H2>
      <P>
        The Service, including its software, design, and branding, is owned by us
        or our licensors and is protected by intellectual property laws. SocioBird
        is built on open-source software; nothing here restricts rights you
        already have under the applicable open-source licenses.
      </P>

      <H2>10. Feedback</H2>
      <P>
        If you send us feedback or suggestions about the Service, you agree we may
        use them without any obligation to compensate you.
      </P>

      <H2>11. Suspension and termination</H2>
      <P>
        You may stop using the Service and delete your account at any time from
        your account settings. We may suspend or terminate your access if you
        breach these Terms, if required by law, or if we discontinue the Service.
        Sections that by their nature should survive termination (including
        Sections 5, 6, 9, 10, 13, and 14) will survive.
      </P>

      <H2>12. Disclaimers</H2>
      <P>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT
        WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE
        DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT
        ANY CONNECTED THIRD-PARTY PLATFORM WILL CONTINUE TO BE AVAILABLE OR WILL
        NOT CHANGE ITS OWN RULES.
      </P>

      <H2>13. Limitation of liability</H2>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
        LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
        OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED
        THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR ₹5,000
        (OR THE EQUIVALENT IN YOUR BILLING CURRENCY), WHICHEVER IS GREATER.
      </P>

      <H2>14. Indemnification</H2>
      <P>
        You agree to defend, indemnify, and hold us harmless from any claim arising
        from your content, your use of the Service, or your violation of these
        Terms or of a third-party platform's terms.
      </P>

      <H2>15. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. If we make material changes,
        we will update the &quot;Last updated&quot; date above and, where appropriate,
        notify you by email or through the app. Continued use of the Service after
        a change takes effect constitutes acceptance of the updated Terms.
      </P>

      <H2>16. Governing law and disputes</H2>
      <P>
        These Terms are governed by the laws of India, without regard to its
        conflict-of-law principles. Any dispute arising out of or relating to these
        Terms or the Service will be subject to the exclusive jurisdiction of the
        courts located in India.
      </P>

      <H2>17. Contact</H2>
      <P>
        Questions about these Terms can be sent to{' '}
        <a href="mailto:support@shackyapps.in" className="underline">
          support@shackyapps.in
        </a>
        .
      </P>
    </>
  );
}
