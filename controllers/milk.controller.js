
import DailyMilkEntry from '../models/MilkRecord.js';

export const getDailyMilkEntries = async (req, res) => {
  const { date } = req.params;

  const entryDate = new Date(date);
  const nextDay = new Date(entryDate);
  nextDay.setDate(entryDate.getDate() + 1);

  try {
    const entries = await DailyMilkEntry.find({
      date: { $gte: entryDate, $lt: nextDay }
    }).select('customerId morningMilk eveningMilk');

    res.status(200).json({
      success: true,
      data: entries,
      message: `Found ${entries.length} entries for ${date}.`,
    });

  } catch (err) {
    console.error("Get Daily Milk Entry Error:", err);
    res.status(500).json({ success: false, error: 'Server Error: Could not fetch milk entries.' });
  }
};

export const saveDailyMilkEntries = async (req, res) => {
    const { date, entries } = req.body;

    if (!date || !entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing date or milk entries.' });
    }
    
    if (typeof date !== 'string' || date.length !== 10) {
        return res.status(400).json({ 
            success: false, 
            error: `Invalid date format or length received: ${date}. Expected 'YYYY-MM-DD'.` 
        });
    }

    const entryDate = new Date(date);
    if (isNaN(entryDate.getTime())) {
        return res.status(400).json({ 
            success: false, 
            error: `Invalid date value could not be parsed: ${date}.` 
        });
    }

    try {
        const bulkOperations = entries.map(entry => {
            if (!entry.customerId) return null;

            const updateFields = {};
            updateFields.milkType = entry.milkType;
            updateFields.pricePerLiter = entry.pricePerLiter;

            if (entry.hasOwnProperty('morningMilk')) {
                updateFields.morningMilk = entry.morningMilk;
            }

            if (entry.hasOwnProperty('eveningMilk')) {
                updateFields.eveningMilk = entry.eveningMilk;
            }

            if (Object.keys(updateFields).length === 0) {
                return null;
            }

            return {
                updateOne: {
                    filter: { 
                        customerId: entry.customerId, 
                        date: entryDate // Search by customer ID and date
                    },
                    update: { 
                        $set: updateFields
                    },
                    upsert: true // 🚨 CRITICAL: Insert if not found, Update if found
                }
            };
        }).filter(op => op !== null); // Filter out any invalid operations

        const result = await DailyMilkEntry.bulkWrite(bulkOperations);

        res.status(201).json({
            success: true,
            upsertedCount: result.upsertedCount, // New records created
            modifiedCount: result.modifiedCount, // Existing records updated
            message: `Successfully processed ${result.upsertedCount + result.modifiedCount} daily milk entries for ${date}.`,
        });

    } catch (err) {
        console.error("Daily Milk Entry Error:", err);
        res.status(500).json({ success: false, error: 'Server Error: Could not process milk entries.' });
    }
};

