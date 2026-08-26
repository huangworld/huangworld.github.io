// Fluent 3D emoji icons (assets/emoji, MIT — see assets/emoji/LICENSE.md).
// plantIcon(name, kind) picks an isometric icon for a plant by keyword.

export const ICON_BASE = "/assets/emoji/";

export const UI = {
    today: "sun",
    plants: "potted-plant",
    add: "plus",
    settings: "gear",
    camera: "camera",
    water: "droplet",
    overdue: "alarm-clock",
    seedling: "seedling",
};

const KEYWORDS = [
    [/tomato/, "tomato"],
    [/carrot/, "carrot"],
    [/bell ?pepper|paprika/, "bell-pepper"],
    [/pepper|chili|chilli|jalape/, "hot-pepper"],
    [/cucumber|zucchini|courgette|squash|gourd/, "cucumber"],
    [/broccoli|cauliflower/, "broccoli"],
    [/lettuce|salad|leafy|kale|spinach|chard|bok ?choy|cabbage|arugula|greens/, "leafy-green"],
    [/corn|maize/, "ear-of-corn"],
    [/eggplant|aubergine/, "eggplant"],
    [/potato/, "potato"],
    [/onion|scallion|shallot|leek|chive/, "onion"],
    [/garlic/, "garlic"],
    [/mushroom/, "mushroom"],
    [/bean|\bpeas?\b|lentil|edamame/, "beans"],
    [/strawberr/, "strawberry"],
    [/blueberr/, "blueberries"],
    [/lemon|lime|citrus|yuzu/, "lemon"],
    [/grape/, "grapes"],
    [/watermelon/, "watermelon"],
    [/melon|cantaloupe/, "melon"],
    [/avocado/, "avocado"],
    [/peach|nectarine|apricot/, "peach"],
    [/cherry|cherries/, "cherries"],
    [/banana|plantain/, "banana"],
    [/basil|mint|herb|cilantro|coriander|parsley|rosemary|thyme|oregano|sage|dill|lemongrass/, "herb"],
    [/cactus|succulent|aloe|agave/, "cactus"],
    [/sunflower/, "sunflower"],
    [/tulip/, "tulip"],
    [/rose/, "rose"],
    [/hibiscus/, "hibiscus"],
    [/orchid|blossom|flower|peony|lily|jasmine|lavender/, "blossom"],
    [/clover/, "four-leaf-clover"],
    [/palm|monstera|pothos|philodendron|fern|banana ?tree/, "palm-tree"],
    [/tree|ficus|bonsai/, "deciduous-tree"],
];

export function plantIcon(name, kind) {
    const n = (name || "").toLowerCase();
    for (const [re, icon] of KEYWORDS) {
        if (re.test(n)) return icon;
    }
    return kind === "houseplant" ? "potted-plant" : "seedling";
}

export function iconUrl(icon) {
    return `${ICON_BASE}${icon}.png`;
}
