const db = require('../config/db');
const webpush = require('web-push');

// Configure web-push using existing environment variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:hello@passivelyplus.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
}

const createLead = async (req, res) => {
    const { user_id, source, name, phone, email, questionnaire_answers } = req.body;

    if (!user_id || !source) {
        return res.status(400).json({ error: 'user_id and source are required' });
    }

    try {
        const lead_id = 'lead_' + Math.random().toString(36).substring(2, 11);

        // 1. Insert the lead normally
        const query = `
            INSERT INTO leads (lead_id, user_id, source, name, phone, email, questionnaire_answers)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [
            lead_id, 
            user_id, 
            source, 
            name || null, 
            phone || null, 
            email || null, 
            JSON.stringify(questionnaire_answers || {})
        ];

        const result = await db.query(query, values);
        const newLead = result.rows[0];

        // 2. Attempt to send Instant Owner Notification
        try {
            const subQuery = `SELECT subscription FROM owner_subscriptions WHERE user_id = $1`;
            const subResult = await db.query(subQuery, [user_id]);

            if (subResult.rows.length > 0) {
                const subscription = subResult.rows[0].subscription;
                
                const notificationTitle = '🎉 New Lead Captured';
                const notificationBody = name 
                    ? `${name}\n${source}\nSubmitted just now` 
                    : `A new visitor submitted information.\n${source}`;

                const payload = JSON.stringify({
                    title: notificationTitle,
                    body: notificationBody,
                    data: {
                        url: '/leads',
                        lead_id: lead_id,
                        user_id: user_id,
                        source: source
                    }
                });

                await webpush.sendNotification(subscription, payload);
                console.log(`Owner notification successfully sent for lead: ${lead_id}`);
            }
        } catch (notifyError) {
            // Failure to notify should NOT prevent the lead from being saved
            console.error('Failed to send owner notification (lead was still saved):', notifyError);
        }

        res.status(201).json({ success: true, data: newLead });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getLeads = async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        const query = `SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC`;
        const result = await db.query(query, [user_id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { createLead, getLeads };
