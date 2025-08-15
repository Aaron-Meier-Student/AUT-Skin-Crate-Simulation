function hsvToRgb(h, s = 1, v = 1) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

function getColorFromPattern(n) {
    n = Math.max(1, Math.min(72, n | 0));
    const step = 5;
    const offset = 1;
    const hueDeg = ((n - 1 + offset) * step) % 360;
    return hsvToRgb(hueDeg / 360, 1, 1);
}

const patternContainer = document.getElementById("pattern-container");

for (let i = 1; i <= 72; i++) {
    const color = getColorFromPattern(i);
    const newElement = document.createElement("div");
    newElement.classList.add("pattern");
    newElement.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    newElement.textContent = i;
    patternContainer.appendChild(newElement);
}

const inventoryDiv = document.getElementById("inventory");

let pity = 0;

// We'll store inventory data here
// { "skinName": { count: number, unique: bool, rarity: string } }
const inventory = {};
let autoDeleteRare = false;
let autoDeleteEpic = false;

function addToInventory(skinData) {
    // Auto-delete Rare check
    if (autoDeleteRare && skinData.rarity === "Rare") {
        return; // skip adding it
    }

    if (autoDeleteEpic && skinData.rarity === "Epic") {
        return; // skip adding it
    }

    const key = skinData.unique
        ? `${skinData.skin}_unique_${Date.now()}_${Math.random()}`
        : skinData.skin;

    if (!skinData.unique && inventory[skinData.skin]) {
        // Increment count for normal skins
        inventory[skinData.skin].count++;
        updateInventoryDisplay(skinData.skin);
        sortInventory();
    } else {
        // Add new entry (either unique or first copy)
        inventory[key] = {
            name: skinData.skin,
            count: 1,
            unique: skinData.unique,
            rarity: skinData.rarity,
        };
        createInventoryItem(key);
        sortInventory();
    }
}

function createInventoryItem(key) {
    const item = inventory[key];
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("inventory-item", item.rarity);
    itemDiv.dataset.key = key;

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("skin-name");
    nameDiv.innerHTML =
        (item.unique
            ? "<strong style='color:#924eff'>Unusual </strong> "
            : "") + item.name;

    const countDiv = document.createElement("div");
    countDiv.classList.add("skin-count");
    countDiv.textContent = item.count > 1 ? item.count : "";

    itemDiv.appendChild(nameDiv);
    itemDiv.appendChild(countDiv);

    inventoryDiv.appendChild(itemDiv);
}

// Define rarity order from highest to lowest
const rarityOrder = ["Universal", "Mythic", "Legendary", "Epic", "Rare"];

function updateInventoryDisplay(skinName) {
    // Update counts as before
    const key = skinName;
    const itemDiv = Array.from(inventoryDiv.children).find(
        (div) => div.dataset.key === key
    );
    if (itemDiv) {
        const countDiv = itemDiv.querySelector(".skin-count");
        const count = inventory[key].count;
        countDiv.textContent = count > 1 ? count : "";
    }
}

function sortInventory() {
    // Sort inventory items by rarity
    const sortedKeys = Object.keys(inventory).sort((a, b) => {
        const rarityA = inventory[a].rarity;
        const rarityB = inventory[b].rarity;

        // Higher rarity comes first
        return rarityOrder.indexOf(rarityA) - rarityOrder.indexOf(rarityB);
    });

    // Re-append items in sorted order
    sortedKeys.forEach((key) => {
        const div = Array.from(inventoryDiv.children).find(
            (d) => d.dataset.key === key
        );
        if (div) inventoryDiv.appendChild(div);
    });
}

let rolls = 0;

function unusualCalculate(rarity) {
    const input = document.getElementById("unucalc").value.trim();

    const skins = allskins[rarity];
    const skinRarity = rarities[rarity] / skins.length;
    const groupRarity = rarities[rarity];

    let chance = 0;
    try {
        chance = eval(input);
    } catch (e) {
        console.warn(`Invalid formula: ${input}`, e);
        chance = 0;
    }

    return chance;
}

function rollSkin() {
    pity++;
    rolls++;
    const rarity = pickRarity();
    const skins = allskins[rarity];
    const chosenSkin = skins[Math.floor(Math.random() * skins.length)];

    document.getElementById("pity").textContent = `Pity: ${pity}`;
    document.getElementById("totalrolls").textContent = `Total Rolls: ${rolls}`;

    let isUnique = false;

    if (["Legendary", "Mythic", "Universal"].includes(rarity)) {
        // unusualCalculate now returns a single chance number for the group
        const skinChance = unusualCalculate(rarity);

        isUnique = Math.random() < skinChance;
    }

    return {
        rarity,
        skin: chosenSkin,
        unique: isUnique,
    };
}



function truncateRepeats(num, decimalPlaces = 6) {
    const numStr = num.toString();
    const [intPart, decPart] = numStr.split(".");
    if (!decPart) return numStr;

    // Find first sequence of repeated digits at the end
    let endIndex = decPart.length;
    for (let i = decPart.length - 3; i >= 0; i--) {
        if (decPart[i] !== decPart[i + 1]) break;
        endIndex = i + 1;
    }

    const truncated = decPart.slice(0, Math.max(endIndex, decimalPlaces));
    return `${intPart}.${truncated}...`;
}

function expectedRollsString(skinRarityPercent, uniquePercent) {
    const skinRarity = skinRarityPercent / 100;
    const uniqueChance = uniquePercent / 100;

    const combined = skinRarity * uniqueChance;
    if (combined === 0) return "Infinity";

    const rolls = Math.round(1 / combined);
    return `1 in ${rolls.toLocaleString()}`;
}

function checkcalcinput() {
    const results = document.getElementById("calcresults");
    let newrarities = {};
    Object.keys(allskins).forEach((r) => {
        const chance = unusualCalculate(r);
        newrarities[r] = chance * 100;
    });
    results.innerHTML = `<strong style='color:#924eff'>Unusual Chances:</strong>
    <font color='#676767'>${expectedRollsString(rarities.Universal, newrarities.Universal)}</font> |
    <font color='#fa5400'>${expectedRollsString(rarities.Mythic, newrarities.Mythic)}</font> |
    <font color='#ff964b'>${expectedRollsString(rarities.Legendary, newrarities.Legendary)}</font> |
    <strike><font color='#af5aff'>${expectedRollsString(rarities.Epic, newrarities.Epic)}</font> |
    <font color='#4b96ff'>${expectedRollsString(rarities.Rare, newrarities.Rare)}</font></strike> |
    <strong>Skin Rarities (Group): </strong>
    <font color='#676767'>${rarities.Universal}%</font> |
    <font color='#fa5400'>${rarities.Mythic}%</font> |
    <font color='#ff964b'>${rarities.Legendary}%</font> |
    <font color='#af5aff'>${rarities.Epic}%</font> |
    <font color='#4b96ff'>${rarities.Rare}%</font>`;
}
// Optional: recalc on input change
document.getElementById("unucalc").addEventListener("input", checkcalcinput);
checkcalcinput();
function pickRarity() {
    if (pity >= 100) {
        pity = 0;
        return "Mythic";
    }

    const totalWeight = Object.values(rarities).reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    for (const [rarity, weight] of Object.entries(rarities)) {
        if (rand < weight) return rarity;
        rand -= weight;
    }

    return Object.keys(rarities)[0];
}

function rollNumber(c) {
    const results = [];
    for (let i = 0; i < c; i++) {
        const skin = rollSkin();
        results.push(skin);

        if (skin.unique) {
            uniqueCounts[skin.rarity]++;
        }
    }

    displayResults(results);
    logUniqueStats();
}

document.getElementById("r1").addEventListener("click", () => {
    rollNumber(1);
});
document.getElementById("r10").addEventListener("click", () => {
    rollNumber(10);
});
document.getElementById("r100").addEventListener("click", () => {
    rollNumber(100);
});

function displayResults(results) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = results
        .map(
            (r) =>
                `<div class="RollResult ${r.rarity}">
                    <strong style='color:#924eff'>${
                        r.unique ? "Unusual " : ""
                    }</strong>${r.skin}
                </div>`
        )
        .join("");

    // Also update inventory
    results.forEach((skin) => addToInventory(skin));
}
const uniqueCounts = {
    Legendary: 0,
    Mythic: 0,
    Universal: 0,
};

// Expected rolls per skin type
const expectedRolls = {
    Legendary: expectedRollsString(rarities.Legendary, unusualCalculate("Legendary")*100),
    Mythic: expectedRollsString(rarities.Mythic, unusualCalculate("Mythic")*100),
    Universal: expectedRollsString(rarities.Universal, unusualCalculate("Universal")*100),
};

function logUniqueStats() {
    console.log(
        `Unique Counts → Legendary: ${uniqueCounts.Legendary} (${expectedRolls.Legendary}), ` +
        `Mythic: ${uniqueCounts.Mythic} (${expectedRolls.Mythic}), ` +
        `Universal: ${uniqueCounts.Universal} (${expectedRolls.Universal})`
    );
}

document.getElementById("ClearAll").addEventListener("click", () => {
    // Delete all skins
    Object.keys(inventory).forEach((key) => {
        delete inventory[key];
        const itemDiv = document.querySelector(`.inventory-item[data-key="${key}"]`);
        if (itemDiv) itemDiv.remove();
    });
    sortInventory();
});
document.getElementById("ClearDupes").addEventListener("click", () => {
    // Delete all duplicate skins
    Object.keys(inventory).forEach((key) => {
        const item = inventory[key];
        if (item.count > 1) {
            inventory[key].count = 1;
            updateInventoryDisplay(item.name);
        }
    });
    sortInventory();
});
document.getElementById("ClearER").addEventListener("click", () => {
    // Delete all Epic and Rare skins
    Object.keys(inventory).forEach((key) => {
        const item = inventory[key];
        if (item.rarity === "Epic" || item.rarity === "Rare") {
            delete inventory[key];
            const itemDiv = document.querySelector(`.inventory-item[data-key="${key}"]`);
            if (itemDiv) itemDiv.remove();
        }
    });
    sortInventory();
});
document.getElementById("AutoClearER").addEventListener("click", () => {
    autoDeleteEpic = !autoDeleteEpic;
    autoDeleteRare = autoDeleteEpic;
    document.getElementById("AutoClearER").textContent = autoDeleteEpic ? "Auto Clear Epics & Rares: ON" : "Auto Clear Epics & Rares: OFF";
});