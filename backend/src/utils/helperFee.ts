/**
 * Helper Fee Calculation Utilities
 * 
 * Provides functions to calculate helper fees based on appointment price
 * and helper payout configuration (FIXED or PERCENTAGE mode).
 */

/**
 * Round currency value to 2 decimal places
 */
export const roundCurrency = (value: number): number => {
    return Math.round(value * 100) / 100;
};

/**
 * Calculate helper fee based on appointment price and helper payout settings
 * 
 * @param price - Appointment price
 * @param helper - Helper with payout configuration
 * @returns Calculated helper fee, rounded to 2 decimals
 */
export const calculateHelperFee = (
    price: number,
    helper: {
        helperPayoutMode: string;
        helperPayoutValue: number
    }
): number => {
    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
        return 0;
    }

    // Calculate based on mode
    let fee: number;
    if (helper.helperPayoutMode === 'PERCENTAGE') {
        fee = (price * helper.helperPayoutValue) / 100;
    } else {
        // FIXED mode
        fee = helper.helperPayoutValue;
    }

    // Ensure non-negative and rounded
    return Math.max(0, roundCurrency(fee));
};

/**
 * Validate helper fee against appointment price
 * 
 * @param helperFee - Proposed helper fee
 * @param price - Appointment price
 * @param maxPercentage - Maximum allowed percentage (default 100%)
 * @returns Validation result with error message if invalid
 */
export const validateHelperFee = (
    helperFee: number,
    price: number,
    maxPercentage: number = 100
): { valid: boolean; error?: string } => {
    if (!Number.isFinite(helperFee) || helperFee < 0) {
        return { valid: false, error: 'Helper fee must be a non-negative number' };
    }

    if (!Number.isFinite(price) || price <= 0) {
        return { valid: false, error: 'Invalid appointment price' };
    }

    const percentage = (helperFee / price) * 100;
    if (percentage > maxPercentage) {
        return {
            valid: false,
            error: `Helper fee cannot exceed ${maxPercentage}% of appointment price`
        };
    }

    return { valid: true };
};

/**
 * Format helper fee explanation for display
 * 
 * @param fee - Calculated fee
 * @param price - Appointment price
 * @param mode - Payout mode
 * @param value - Payout value
 * @returns Human-readable explanation
 */
export const formatFeeExplanation = (
    fee: number,
    price: number,
    mode: string,
    value: number
): string => {
    if (mode === 'PERCENTAGE') {
        return `${value}% de $${price.toFixed(2)} = $${fee.toFixed(2)}`;
    } else {
        return `Valor fixo: $${fee.toFixed(2)}`;
    }
};
