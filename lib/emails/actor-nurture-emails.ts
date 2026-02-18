interface ActorEmailData {
  name: string;
  email: string;
  reminderNumber: 1 | 2 | 3;
}

export function getActorNurtureEmail(data: ActorEmailData) {
  const { name, reminderNumber } = data;
  const firstName = name?.split(' ')[0] || 'there';
  const readersUrl = `${process.env.NEXT_PUBLIC_URL}/readers`;

  if (reminderNumber === 1) {
    return {
      subject: "Welcome to Self Tape Reader! Here's how it works 🎬",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Self Tape Reader</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Hey ${firstName}!</p>
            
            <p style="font-size: 16px; color: #333;">Welcome to Self Tape Reader! You're now part of a community of actors helping actors nail their auditions.</p>
            
            <p style="font-size: 16px; color: #333;"><strong>Here's how it works:</strong></p>
            
            <ol style="font-size: 16px; color: #333;">
              <li>Browse our readers (real actors, not AI)</li>
              <li>Pick a time that works for you</li>
              <li>Get on a video call and record your self-tape</li>
            </ol>
            
            <p style="font-size: 16px; color: #333;">Sessions start at just $15 for 15 minutes.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${readersUrl}" style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Browse Readers</a>
            </div>
            
            <p style="font-size: 16px; color: #333;">Break a leg! 🎭</p>
            <p style="font-size: 16px; color: #333;">— The Self Tape Reader Team</p>
          </div>
          <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">Real humans. Real reads. Real results.</p>
          </div>
        </div>
      `,
    };
  }

  if (reminderNumber === 2) {
    return {
      subject: "Audition coming up? Your readers are ready 🎯",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Self Tape Reader</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Hey ${firstName}!</p>
            
            <p style="font-size: 16px; color: #333;">Just checking in — when that audition drops, we've got you covered.</p>
            
            <p style="font-size: 16px; color: #333;">We have <strong>20+ readers available</strong> right now, ready to help you nail your next self-tape.</p>
            
            <p style="font-size: 16px; color: #333;">No subscriptions. No commitments. Just book when you need it.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${readersUrl}" style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Find a Reader</a>
            </div>
            
            <p style="font-size: 16px; color: #333;">Here when you need us! 🎬</p>
            <p style="font-size: 16px; color: #333;">— The Self Tape Reader Team</p>
          </div>
          <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">Real humans. Real reads. Real results.</p>
          </div>
        </div>
      `,
    };
  }

  // reminderNumber === 3
  return {
    subject: `Quick question, ${firstName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Self Tape Reader</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #333;">Hey ${firstName},</p>
          
          <p style="font-size: 16px; color: #333;">I'm Paul, the founder of Self Tape Reader. I noticed you signed up but haven't booked a session yet.</p>
          
          <p style="font-size: 16px; color: #333;">I'm genuinely curious — what's holding you back?</p>
          
          <ul style="font-size: 16px; color: #333;">
            <li>Haven't had an audition come up yet?</li>
            <li>Not sure if it's worth it?</li>
            <li>Something confusing about the process?</li>
          </ul>
          
          <p style="font-size: 16px; color: #333;"><strong>Just hit reply and let me know.</strong> I read every response and would love your feedback.</p>
          
          <p style="font-size: 16px; color: #333;">And of course, when that audition does land, we're here:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${readersUrl}" style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Browse Readers</a>
          </div>
          
          <p style="font-size: 16px; color: #333;">Thanks for being part of this,</p>
          <p style="font-size: 16px; color: #333;">— Paul</p>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">Real humans. Real reads. Real results.</p>
        </div>
      </div>
    `,
  };
}
