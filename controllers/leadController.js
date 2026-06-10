const db = require('../config/db');
const crypto = require('crypto');
const webpush = require('web-push');
const { Resend } = require('resend');

// Configure web-push if private key is available
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BCAXtPIKOJBXE76VLktxcA0vhYQzcUW8b9ODW88j7v7VefWhwknlXmaHWpOfKoVEA2sAAJN_2t1jaPwTEaAG6xA';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const mailto = process.env.VAPID_MAILTO || 'mailto:hello@passivelyplus.com';

if (privateVapidKey) {
  try {
    webpush.setVapidDetails(mailto, publicVapidKey, privateVapidKey);
  } catch (e) {
    console.error('Failed to configure web-push:', e);
  }
}

// Configure Resend
const resend = new Resend(process.env.RESEND_API_KEY);

exports.createLead = async (req, res) => {
  try {
    const { user_id, source, name, phone, email, questionnaire_answers } = req.body;

    if (!user_id || !source) {
      return res.status(400).json({ error: 'user_id and source are required' });
    }

    const lead_id = `lead_${crypto.randomBytes(8).toString('hex')}`;

    const insertQuery = `
      INSERT INTO leads (lead_id, user_id, source, name, phone, email, questionnaire_answers, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      lead_id,
      user_id,
      source,
      name || null,
      phone || null,
      email || null,
      questionnaire_answers ? JSON.stringify(questionnaire_answers) : null
    ]);

    // 1. Attempt to send a push notification to the account owner
    try {
      if (privateVapidKey) {
        const subQuery = 'SELECT subscription FROM owner_subscriptions WHERE user_id = $1';
        const subResult = await db.query(subQuery, [user_id]);

        if (subResult.rows.length > 0) {
          const subscription = subResult.rows[0].subscription;
          
          const title = '🎉 New Lead Captured';
          const body = name ? `${name}\n${source}\nSubmitted just now` : `A new visitor submitted information.\n${source}`;
          
          const payload = JSON.stringify({
            title,
            body,
            data: {
              lead_id,
              user_id,
              source,
              type: 'lead_notification'
            }
          });

          await webpush.sendNotification(subscription, payload);
          console.log(`Successfully sent lead push notification to owner ${user_id}`);
        } else {
          console.log(`No owner_subscription found for user_id ${user_id}`);
        }
      } else {
        console.log('VAPID_PRIVATE_KEY not configured, skipping lead push notification');
      }
    } catch (notifyError) {
      // Do not fail lead creation if push notification fails
      console.error('Failed to send lead push notification:', notifyError);
    }

    // 2. Attempt to send Email Notification via Resend
    try {
      if (process.env.RESEND_API_KEY) {
        // Fetch owner's email from the users table
        const userQuery = 'SELECT email FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [user_id]);
        
        if (userResult.rows.length > 0 && userResult.rows[0].email) {
          const ownerEmail = userResult.rows[0].email;
          
          // Format Questionnaire Answers
          let answersHtml = '';
          if (questionnaire_answers && Object.keys(questionnaire_answers).length > 0) {
            answersHtml = '<h3>Questionnaire Answers:</h3><ul style="padding-left: 20px; font-size: 14px; line-height: 1.6;">';
            for (const [key, value] of Object.entries(questionnaire_answers)) {
              answersHtml += `<li><strong>${key}:</strong> ${value}</li>`;
            }
            answersHtml += '</ul>';
          }
          
          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
              <h2 style="color: #fe0191; margin-top: 0;">🎉 New Lead Captured</h2>
              <p style="font-size: 16px;">A new lead has been captured via <strong>${source}</strong>.</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 16px;">Lead Details:</h3>
                <ul style="padding-left: 20px; margin-bottom: 0; font-size: 14px; line-height: 1.6;">
                  <li><strong>Name:</strong> ${name || 'N/A'}</li>
                  <li><strong>Email:</strong> ${email || 'N/A'}</li>
                  <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              ${answersHtml}
              
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0 20px 0;" />
              <p style="color: #666; font-size: 12px; margin: 0;">Log in to your Passively dashboard to view more details.</p>
            </div>
          `;

          await resend.emails.send({
            from: 'Passively <notifications@send.gopassively.com>',
            to: ownerEmail,
            subject: '🎉 New Lead Captured - Passively',
            html: htmlContent
          });
          
          console.log(`Successfully sent lead email notification to owner ${user_id}`);
        } else {
          console.log(`No owner email found for user_id: ${user_id}. Skipping email notification.`);
        }
      } else {
        console.log('RESEND_API_KEY is not configured. Skipping email notification.');
      }
    } catch (emailError) {
      // Do not fail lead creation if email notification fails
      console.error('Failed to send lead email notification:', emailError);
    }

    res.status(201).json({ success: true, lead: result.rows[0], lead_id });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const query = 'SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC;';
    const result = await db.query(query, [user_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
