class ShoppingCartDiscount {
    constructor(id, name, value, isPercent, isSplitDiscount = false) {

        this.DiscountId = id;
        this.DiscountName = name;
        this.Value = value;
        this.IsPercent = !!isPercent;
        this.IsMergedPartiallyPaidDiscount = isSplitDiscount

    }
};