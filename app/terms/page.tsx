export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          <strong>Last Updated:</strong> November 13, 2025
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using Self-Tape Reader ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              Self-Tape Reader is an online marketplace that connects actors ("Actors") with experienced readers ("Readers") 
              for self-tape audition support services. Readers provide off-camera line reading services to assist Actors 
              in recording their audition tapes. The Service facilitates booking, scheduling, and payment processing for these sessions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>3.1 Account Creation:</strong> You must create an account to use certain features of the Service. 
                You agree to provide accurate, current, and complete information during registration.
              </p>
              <p>
                <strong>3.2 Account Security:</strong> You are responsible for maintaining the confidentiality of your account 
                credentials and for all activities that occur under your account.
              </p>
              <p>
                <strong>3.3 User Types:</strong> Users may register as either Actors (who book sessions) or Readers 
                (who provide reading services and pay a monthly subscription fee).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Reader Services and Obligations</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>4.1 Independent Contractor Status:</strong> Readers are independent contractors, not employees of Self-Tape Reader. 
                Readers maintain complete control over their rates, availability, and working methods. The platform merely facilitates 
                connections between Readers and Actors.
              </p>
              <p>
                <strong>4.2 Nature of Services:</strong> Readers provide audition support services, specifically off-camera line reading. 
                This is not acting work, performance work, or employment as a performer. Readers are providing a technical support service 
                to assist Actors with their audition preparation and recording.
              </p>
              <p>
                <strong>4.3 Union and Guild Compliance:</strong> Readers are solely responsible for ensuring their participation on this 
                platform complies with any union, guild, or professional organization agreements they may be party to, including but not 
                limited to SAG-AFTRA, AEA, AGVA, or any other performer unions. Self-Tape Reader makes no representations regarding 
                union compliance and accepts no liability for any union-related issues arising from Reader participation.
              </p>
              <p>
                <strong>4.4 Reader Subscription:</strong> Readers must maintain an active subscription ($9.99/month) 
                to offer services on the platform.
              </p>
              <p>
                <strong>4.5 Service Quality:</strong> Readers agree to provide professional, punctual, and courteous 
                reading services as scheduled.
              </p>
              <p>
                <strong>4.6 Availability:</strong> Readers are responsible for maintaining accurate availability 
                and honoring confirmed bookings.
              </p>
              <p>
                <strong>4.7 Payment Processing:</strong> Readers must connect a valid Stripe account to receive payments. 
                Readers retain 80% of session fees, with 20% retained by the platform.
              </p>
              <p>
                <strong>4.8 Tax Obligations:</strong> As independent contractors, Readers are solely responsible for all tax obligations 
                arising from their earnings, including income tax, self-employment tax, and any other applicable taxes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Actor Obligations</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>5.1 Payment:</strong> Actors agree to pay for booked sessions at the rates set by individual Readers.
              </p>
              <p>
                <strong>5.2 Attendance:</strong> Actors must attend scheduled sessions on time and come prepared 
                with necessary materials.
              </p>
              <p>
                <strong>5.3 Professional Conduct:</strong> Actors agree to interact professionally and respectfully 
                with Readers during sessions.
              </p>
              <p>
                <strong>5.4 Rights to Materials:</strong> Actors represent that they have the right to use any scripts, 
                sides, or other materials shared during sessions for audition purposes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payments and Fees</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>6.1 Session Fees:</strong> Actors pay session fees directly through the platform using Stripe. 
                Payments are processed upon booking confirmation.
              </p>
              <p>
                <strong>6.2 Revenue Split:</strong> The platform retains 20% of each session fee, with 80% paid to the Reader.
              </p>
              <p>
                <strong>6.3 Subscription Fees:</strong> Reader subscriptions are billed monthly and automatically renewed 
                unless cancelled.
              </p>
              <p>
                <strong>6.4 Refunds:</strong> Refunds are handled on a case-by-case basis and may be subject to 
                cancellation policies and processing fees.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cancellation and Refund Policy</h2>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm font-semibold text-blue-900">📋 Quick Reference</p>
              <p className="text-sm text-blue-800 mt-1">
                Actor cancels 2+ hours before: Full refund minus ~$2 processing fee<br/>
                Actor cancels under 2 hours: No refund, reader receives full payment<br/>
                Reader cancels 24+ hours before: Full refund to actor<br/>
                Reader no-show or major issue: Full refund + $5-10 platform credit
              </p>
            </div>

            <div className="space-y-4 text-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Actor-Initiated Cancellations</h3>
              <p>
                <strong>7.1.1 Advance Notice (2+ Hours):</strong> If an Actor cancels a session with at least 2 hours notice 
                before the scheduled start time, they will receive a full refund minus a small payment processing fee 
                (typically $1.50-$2.00). The Reader will not be paid for the cancelled session.
              </p>
              <p>
                <strong>7.1.2 Late Cancellation (Under 2 Hours):</strong> If an Actor cancels with less than 2 hours notice, 
                no refund will be issued. The Reader will receive their full session payment as they have reserved this time 
                and likely declined other booking opportunities.
              </p>
              <p>
                <strong>7.1.3 No-Show:</strong> If an Actor fails to attend a scheduled session without cancelling, 
                this is treated as a late cancellation. No refund will be issued and the Reader receives full payment. 
                Repeated no-shows may result in account suspension.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 Reader-Initiated Cancellations and Issues</h3>
              <p>
                <strong>7.2.1 Advance Cancellation (24+ Hours):</strong> If a Reader cancels with at least 24 hours notice, 
                the Actor receives a full refund with no processing fees deducted.
              </p>
              <p>
                <strong>7.2.2 Late Cancellation (Under 24 Hours):</strong> If a Reader cancels with less than 24 hours notice, 
                the Actor receives a full refund. The Reader may receive a warning and, with repeated occurrences, 
                may face account suspension. The platform monitors reader reliability to maintain service quality.
              </p>
              <p>
                <strong>7.2.3 Reader No-Show:</strong> If a Reader fails to attend a scheduled session, the Actor receives 
                a full refund plus a platform credit of $5-10 for the inconvenience. The Reader will face account penalties, 
                which may include suspension or removal from the platform for serious or repeat violations.
              </p>
              <p>
                <strong>7.2.4 Late Arrival (5+ Minutes):</strong> If a Reader is more than 5 minutes late to a session, 
                the session time will be automatically extended by the delay duration at no additional cost to the Actor, 
                ensuring they receive their full booked session time. Repeated tardiness may affect the Reader's 
                reliability score and platform standing.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.3 Technical Issues and Service Failures</h3>
              <p>
                <strong>7.3.1 Platform/Video Service Failure:</strong> If the platform's video conferencing service or 
                core functionality fails and prevents a session from occurring, the Actor will receive either a full refund 
                or a free rescheduled session at their preference. The Reader will not be penalized for platform failures.
              </p>
              <p>
                <strong>7.3.2 Actor's Internet/Technical Issues:</strong> If an Actor experiences internet connectivity 
                problems or technical issues on their end that prevent or disrupt the session, no refund will be issued. 
                Actors are responsible for ensuring they have adequate internet connectivity and functioning equipment. 
                The Reader will receive full payment as they fulfilled their availability commitment.
              </p>
              <p>
                <strong>7.3.3 Reader's Internet/Technical Issues:</strong> If a Reader experiences internet or technical 
                problems that prevent or significantly disrupt a session, the Actor will receive a partial or full refund 
                depending on the severity and duration of the disruption. The Reader may be subject to penalties if technical 
                issues are frequent, as Readers are expected to maintain reliable service capability.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.4 Rescheduling</h3>
              <p>
                <strong>7.4.1 Actor Reschedule Requests:</strong> Actors may reschedule sessions up to 2 hours before 
                the scheduled start time at no charge, subject to the Reader's availability. Reschedule requests with less 
                than 2 hours notice are treated as late cancellations (no refund, reader paid in full).
              </p>
              <p>
                <strong>7.4.2 Reader Reschedule Requests:</strong> If a Reader needs to reschedule, they must provide 
                at least 24 hours notice. The Actor may choose to accept the new time or receive a full refund.
              </p>
              <p>
                <strong>7.4.3 Mutual Agreement:</strong> Both parties may mutually agree to reschedule at any time, 
                regardless of the above notice periods, if both consent to the change.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.5 Dispute Resolution and Incident Reporting</h3>
              <p>
                <strong>7.5.1 Dispute Process:</strong> In cases of disagreement about session quality, attendance, 
                or technical issues, either party may file a dispute through the platform within 48 hours of the scheduled 
                session time. Our support team will review evidence including session logs, attendance records, and any 
                available video/technical data.
              </p>
              <p>
                <strong>7.5.2 Incident Reporting:</strong> Users should report any issues (no-shows, late arrivals, 
                technical problems, unprofessional conduct) through the platform immediately following the session. 
                Timely reporting helps us maintain service quality and resolve issues fairly.
              </p>
              <p>
                <strong>7.5.3 Evidence and Documentation:</strong> Users may be asked to provide supporting evidence 
                for disputes, such as screenshots, timestamps, or detailed descriptions of issues. The platform maintains 
                technical logs that may be used to verify claims.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.6 Subscription Cancellation</h3>
              <p>
                <strong>7.6.1 Reader Subscriptions:</strong> Readers may cancel their monthly subscription at any time. 
                Access to the platform continues until the end of the current billing period. No partial refunds are provided 
                for subscription fees.
              </p>
              <p>
                <strong>7.6.2 Outstanding Sessions:</strong> Readers who cancel their subscription must still honor 
                any existing booked sessions. Failure to attend scheduled sessions after cancelling a subscription 
                will result in appropriate penalties and refunds as outlined above.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.7 Refund Processing</h3>
              <p>
                <strong>7.7.1 Processing Time:</strong> Approved refunds are typically processed within 5-10 business days. 
                The actual time for funds to appear in your account depends on your financial institution.
              </p>
              <p>
                <strong>7.7.2 Refund Method:</strong> Refunds are issued to the original payment method used for the booking.
              </p>
              <p>
                <strong>7.7.3 Platform Credits:</strong> In cases where platform credits are issued (such as for Reader 
                no-shows), these credits are applied to your account and can be used toward future bookings. Credits do not expire 
                but are non-transferable and non-refundable for cash.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.8 Reader Reliability Tracking</h3>
              <p>
                <strong>7.8.1 Reliability Score:</strong> The platform maintains a reliability score for all Readers 
                based on factors including cancellation rate, on-time attendance, technical reliability, and Actor feedback. 
                This score may affect a Reader's visibility in search results and ability to remain on the platform.
              </p>
              <p>
                <strong>7.8.2 Penalties and Warnings:</strong> Readers who repeatedly cancel sessions, arrive late, 
                or fail to attend may receive warnings, temporary suspensions, or permanent removal from the platform. 
                We maintain high service standards to protect Actor experiences.
              </p>
              <p>
                <strong>7.8.3 Performance Thresholds:</strong> Readers are expected to maintain at least a 95% attendance rate, 
                with no more than one late cancellation per month and zero no-shows. Falling below these standards may trigger 
                account review.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Prohibited Conduct</h2>
            <div className="space-y-2 text-gray-700">
              <p>Users agree not to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Use the Service for any unlawful purpose or in violation of these Terms</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to circumvent payment systems or engage in fraudulent activities</li>
                <li>Share account credentials or allow unauthorized access to accounts</li>
                <li>Upload or transmit inappropriate, offensive, or copyrighted content</li>
                <li>Interfere with or disrupt the Service or its servers</li>
                <li>Conduct transactions outside the platform to avoid fees</li>
                <li>Misrepresent the nature of services provided (e.g., claiming Reader services constitute acting work or performance)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>9.1 Platform Rights:</strong> The Service and its content are owned by Self-Tape Reader 
                and protected by copyright and other intellectual property laws.
              </p>
              <p>
                <strong>9.2 User Content:</strong> Users retain rights to their uploaded content but grant 
                the platform a license to use such content for Service operation.
              </p>
              <p>
                <strong>9.3 Respect for Third-Party Rights:</strong> Users must respect the intellectual property 
                rights of scripts, sides, and other materials used during sessions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Our collection and use of personal information is governed by our 
              Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent 
              to the collection and use of your information as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers and Limitations of Liability</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>11.1 Service "As Is":</strong> The Service is provided "as is" without warranties of any kind, 
                express or implied.
              </p>
              <p>
                <strong>11.2 No Guarantee:</strong> We do not guarantee the quality, reliability, or availability 
                of Reader services or the success of Actor auditions.
              </p>
              <p>
                <strong>11.3 Limitation of Liability:</strong> Our liability is limited to the maximum extent 
                permitted by law. We are not liable for indirect, incidental, or consequential damages.
              </p>
              <p>
                <strong>11.4 User Responsibility:</strong> Users are solely responsible for their interactions 
                with other users and the outcomes of reading sessions.
              </p>
              <p>
                <strong>11.5 No Legal or Professional Advice:</strong> Self-Tape Reader does not provide legal, tax, 
                or professional advice regarding union membership, contractor status, or any other professional matters. 
                Users should consult appropriate professionals for such guidance.
              </p>
              <p>
                <strong>11.6 Union Compliance:</strong> Self-Tape Reader is not responsible for and makes no warranties 
                regarding compliance with union rules, guild regulations, or professional organization requirements. 
                Users participate at their own risk and are solely responsible for their own compliance obligations.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify and hold harmless Self-Tape Reader, its officers, directors, employees, and agents 
              from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from your use 
              of the Service, violation of these Terms, infringement of third-party rights, or any claims related to 
              union compliance, tax obligations, or independent contractor status.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>13.1 Termination by You:</strong> You may terminate your account at any time by 
                contacting customer support.
              </p>
              <p>
                <strong>13.2 Termination by Us:</strong> We may suspend or terminate accounts for violations 
                of these Terms or other inappropriate conduct.
              </p>
              <p>
                <strong>13.3 Effect of Termination:</strong> Upon termination, your access to the Service will 
                cease, but certain provisions of these Terms will survive termination.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Dispute Resolution</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>14.1 Governing Law:</strong> These Terms are governed by the laws of [Your State/Country], 
                without regard to conflict of law principles.
              </p>
              <p>
                <strong>14.2 Dispute Resolution:</strong> Disputes will be resolved through binding arbitration 
                rather than court proceedings, except where prohibited by law.
              </p>
              <p>
                <strong>14.3 Class Action Waiver:</strong> You agree not to participate in class action lawsuits 
                against the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. Changes will be effective upon posting 
              to the Service. Your continued use of the Service after changes constitute acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Severability</h2>
            <p className="text-gray-700 mb-4">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions 
              will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact Information</h2>
            <div className="text-gray-700">
              <p className="mb-2">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p><strong>Email:</strong> legal@selftapereader.com</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
                <p><strong>Support:</strong> support@selftapereader.com</p>
              </div>
            </div>
          </section>

          <section className="border-t pt-8 mt-12">
            <p className="text-sm text-gray-500">
              By using Self-Tape Reader, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
