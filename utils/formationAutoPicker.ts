/**
 * Smart Tactical Lineup Auto-Picker Algorithm
 * Assigns best players to formation slots based on Position suitability and EA FC / FIFA OVR Rating.
 */
import { FormationPreset, FormationSlot, getPositionCategory } from './formationPresets';
import { calculateFifaAttributes } from './playerCardUtils';

export interface AssignedPitchPlayer {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    number?: string | number;
    photo?: string;
    position?: string;
    role: string; // Slot role e.g. 'GK', 'CB', 'ST'
    category: 'GK' | 'DEF' | 'MID' | 'ATT';
    ovr: number;
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
}

/**
 * Evaluates how suitable a player is for a specific formation slot (0-100 score).
 */
function calculatePositionSuitability(playerPosCategory: string, slotCategory: string, playerOvr: number): number {
    let matchBonus = 0;
    if (playerPosCategory === slotCategory) {
        matchBonus = 30; // Perfect category match
    } else if (
        (playerPosCategory === 'DEF' && slotCategory === 'MID') ||
        (playerPosCategory === 'MID' && (slotCategory === 'DEF' || slotCategory === 'ATT')) ||
        (playerPosCategory === 'ATT' && slotCategory === 'MID')
    ) {
        matchBonus = 10; // Adjacent position flexibility
    } else if (playerPosCategory === 'GK' && slotCategory !== 'GK') {
        matchBonus = -40; // Penalty for placing GK in outfield
    } else if (playerPosCategory !== 'GK' && slotCategory === 'GK') {
        matchBonus = -40; // Penalty for placing outfield in GK
    }

    return playerOvr + matchBonus;
}

/**
 * Automatically picks and assigns the strongest starting XI / squad for a selected formation preset.
 */
export function autoPickLineup(
    availablePlayers: any[],
    preset: FormationPreset
): AssignedPitchPlayer[] {
    if (!availablePlayers || availablePlayers.length === 0 || !preset || !preset.slots) {
        return [];
    }

    // 1. Calculate OVR ratings and categories for all players
    const enrichedPlayers = availablePlayers.map((player) => {
        const id = String(player._id || player.id || '');
        const ovr = calculateFifaAttributes(player).ovr || 60;
        const category = getPositionCategory(player.position);
        const name = (player.firstName || player.name || player.first_name || 'O\'yinchi').trim();
        const lastName = (player.lastName || player.last_name || '').trim();
        const number = player.number || player.player_number || player.shirt_number || '-';
        const photo = player.photo || player.photo_url || player.avatar || null;

        return {
            raw: player,
            id,
            name,
            firstName: name,
            lastName,
            number,
            photo,
            position: player.position || category,
            category,
            ovr,
        };
    });

    const unassigned = [...enrichedPlayers];
    const assignedSlots: AssignedPitchPlayer[] = [];

    // STEP 1: Assign Goalkeeper (GK) slot first
    const gkSlots = preset.slots.filter(s => s.category === 'GK');
    for (const gkSlot of gkSlots) {
        if (unassigned.length === 0) break;

        // Find best GK
        const pureGks = unassigned.filter(p => p.category === 'GK');
        let selectedPlayer;

        if (pureGks.length > 0) {
            pureGks.sort((a, b) => b.ovr - a.ovr);
            selectedPlayer = pureGks[0];
        } else {
            // If no pure GK, take player with lowest offensive rating / highest defense
            unassigned.sort((a, b) => a.ovr - b.ovr);
            selectedPlayer = unassigned[0];
        }

        if (selectedPlayer) {
            assignedSlots.push({
                id: selectedPlayer.id,
                name: selectedPlayer.name,
                firstName: selectedPlayer.firstName,
                lastName: selectedPlayer.lastName,
                number: selectedPlayer.number,
                photo: selectedPlayer.photo,
                position: selectedPlayer.position,
                role: gkSlot.role,
                category: 'GK',
                ovr: selectedPlayer.ovr,
                x: gkSlot.x,
                y: gkSlot.y,
            });
            const idx = unassigned.findIndex(p => p.id === selectedPlayer.id);
            if (idx > -1) unassigned.splice(idx, 1);
        }
    }

    // STEP 2: Assign Outfield Slots (DEF, MID, ATT)
    const outfieldSlots = preset.slots.filter(s => s.category !== 'GK');

    for (const slot of outfieldSlots) {
        if (unassigned.length === 0) break;

        // Rank remaining players for this slot
        let bestPlayerIndex = 0;
        let highestSuitability = -999;

        unassigned.forEach((p, idx) => {
            const score = calculatePositionSuitability(p.category, slot.category, p.ovr);
            if (score > highestSuitability) {
                highestSuitability = score;
                bestPlayerIndex = idx;
            }
        });

        const chosenPlayer = unassigned[bestPlayerIndex];
        if (chosenPlayer) {
            assignedSlots.push({
                id: chosenPlayer.id,
                name: chosenPlayer.name,
                firstName: chosenPlayer.firstName,
                lastName: chosenPlayer.lastName,
                number: chosenPlayer.number,
                photo: chosenPlayer.photo,
                position: chosenPlayer.position,
                role: slot.role,
                category: slot.category,
                ovr: chosenPlayer.ovr,
                x: slot.x,
                y: slot.y,
            });
            unassigned.splice(bestPlayerIndex, 1);
        }
    }

    return assignedSlots;
}
