/**
 * Production Time Calculator for LM Passo
 * Calculates estimated production time based on product names and quantities.
 */

function calculateProductionTime(items) {
    let totalMinutes = 0;
    let breakdownLines = [];

    items.forEach(item => {
        const name = (item.name || "").toUpperCase();
        const qty = parseInt(item.quantity) || 0;
        let itemMinutes = 0;

        // 1. Rule: Adesivo (Corte) - 1 min per unit
        if (name.includes("ADESIVO")) {
            itemMinutes += 1 * qty;
        }

        // 2. Rule: Jato de Tinta - 1 min per page
        if (name.includes("JATO")) {
            itemMinutes += 1 * qty;
        }

        // 3. Rule: Laser A3 - 25 seconds
        if (name.includes("LASER") && name.includes("A3")) {
            itemMinutes += (25 / 60) * qty;
        } 
        // 4. Rule: Laser A4 - 20 seconds
        else if (name.includes("LASER")) {
            itemMinutes += (20 / 60) * qty;
        }

        // 5. Rule: Outros A3 - 1.5 min (If A3 is present but not Laser)
        if (name.includes("A3") && !name.includes("LASER")) {
             // Avoid double counting if Jato was already counted
             if (!name.includes("JATO")) {
                itemMinutes += 1.5 * qty;
             }
        }

        // 6. Finishing Rules (Check if present in name)
        if (name.includes("LAMINAD") || name.includes("LAMINAÇ")) {
            itemMinutes += 5 * qty;
        }
        if (name.includes("PLASTIFIC")) {
            itemMinutes += 1 * qty;
        }

        // Default if no rules matched
        if (itemMinutes === 0) {
            itemMinutes = 0.5 * qty; // 30 seconds default per unit
        }

        totalMinutes += itemMinutes;
        if (itemMinutes > 0) {
            breakdownLines.push(`${qty}x ${item.name}: ${itemMinutes.toFixed(1)} min`);
        }
    });

    return {
        minutes: Math.ceil(totalMinutes),
        breakdown: breakdownLines.join("\n")
    };
}

module.exports = { calculateProductionTime };
