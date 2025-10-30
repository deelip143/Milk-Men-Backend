import User from '../models/User.js';
import DailyMilkEntry from '../models/MilkRecord.js';
import Customer from '../models/Customer.js';

export const updateSellerProfile = async (req, res) => {
  try {
    const userId = req.user.id; // user is decoded from token (middleware)
    const { name, gender, dob, address } = req.body;

    let updateData = { name, gender, dob, address };

    if (req.file) {
      const profilePic = `/uploads/${req.file.filename}`;
      updateData.profilePic = profilePic;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getSellerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user)
      return res.status(404).json({ success: false, message: 'Seller not found' });

    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getDailyMilkSummary = async (req, res) => {
  try {
    const { date } = req.params;

    if (typeof date !== 'string' || date.length !== 10) {
      return res.status(400).json({ 
          success: false, 
          message: `Invalid date format received in URL: ${date}. Expected YYYY-MM-DD.`,
          error: 'InvalidDateFormat'
      });
    }

    const entryDate = new Date(date);
    if (isNaN(entryDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: `Date parameter could not be parsed: ${date}.`,
        error: 'DateParsingFailed'
      });
    }
    entryDate.setUTCHours(0, 0, 0, 0);

    const entries = await DailyMilkEntry.find({ date: entryDate });

    // Calculate totals
    let totalMorningSell = 0;
    let totalEveningSell = 0;
    let todayEarnings = 0;

    entries.forEach(entry => {
      const morning = entry.morningMilk || 0;
      const evening = entry.eveningMilk || 0;
      const price = entry.pricePerLiter || 0;

      totalMorningSell += morning;
      totalEveningSell += evening;
      todayEarnings += (morning + evening) * price;
    });

    res.status(200).json({
      date: entryDate.toISOString().split('T')[0],
      totalMorningSell,
      totalEveningSell,
      todayEarnings
    });

  } catch (error) {
    console.error('Error fetching milk summary:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getYtdSummary = async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments({ isActive: true });
        const milkAggregation = await DailyMilkEntry.aggregate([
        {
            $group: {
                _id: null, // Group all documents together
                totalMilk: {
                    $sum: {
                        $add: ["$morningMilk", "$eveningMilk"]
                    }
                },
                totalCash: {
                    $sum: {
                        $multiply: [
                            { $add: ["$morningMilk", "$eveningMilk"] },
                            "$pricePerLiter"
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalMilk: 1,
                totalCash: 1
            }
        }
        ]);

        const aggregatedTotals = milkAggregation.length > 0 ? milkAggregation[0] : { totalMilk: 0, totalCash: 0 };
        
        res.status(200).json({
            success: true,
            data: {
                totalCustomers: totalCustomers,
                totalMilkSold: aggregatedTotals.totalMilk,
                totalCash: aggregatedTotals.totalCash,
            },
            message: "Successfully fetched YTD performance summary."
        });

    } catch (err) {
        console.error("YTD Summary Error:", err);
        res.status(500).json({ 
            success: false, 
            error: 'Server Error: Could not fetch business totals.' 
        });
    }
};
