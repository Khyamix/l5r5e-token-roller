const L5R5E = {
    log: (message) => console.log(`L5R5E Roller | ${message}`),
    error: (err) => console.error(`L5R5E Roller | Error:`, err)
        
class L5R5ETokenRoller {
    static init() {
        this.registerHooks();
        console.log("L5R5E Token Roller | Initialized");
    }

    static registerHooks() {
        Hooks.on("renderActorSheet", (sheet, html, data) => {
            this.addSheetRollButton(sheet, html);
        });

       Hooks.on("getSceneControlButtons", (controls) => {
    const token = canvas.tokens.controlled[0]; // ← Substituir aqui
    if (!token) return;
    
    const button = {
        name: "l5r5e-roller",
        title: "L5R 5E Roller",
        icon: "fas fa-dice",
        button: true,
        onClick: () => this.openSkillSelector(token.actor) //
    };
    
    controls.find(c => c.name === "token").tools.push(button);
});
    }

    static addSheetRollButton(sheet, html) {
        const button = $(`<button class="l5r5e-roller-button"><i class="fas fa-dice"></i> Roll Skill</button>`);
        button.click(() => this.openSkillSelector(sheet.actor));
        html.find('.window-header .header-buttons').prepend(button);
    }

    static addTokenTool(controls) {
        if (game.system.id !== "l5r5e") return;

        const tokenTools = controls.find(c => c.name === "token");
        tokenTools.tools.push({
            name: "l5r5e-roller",
            title: "L5R 5E Roller",
            icon: "fas fa-dice",
            button: true,
            onClick: () => this.openSkillSelector(controlledToken?.actor),
            visible: game.user.isGM || !!controlledToken?.actor
        });
    }

    static async openSkillSelector(actor) {
        if (!actor) {
            ui.notifications.warn("No actor selected");
            return;
        }

        const skills = Object.entries(actor.system.skills)
            .filter(([_, skill]) => skill.rank > 0)
            .sort((a, b) => a[1].label.localeCompare(b[1].label));

        new Dialog({
            title: `${actor.name} - Select Skill`,
            content: `
                <form class="l5r5e-form">
                    <div class="form-group">
                        <label>Skill:</label>
                        <select id="skillSelect">${
                            skills.map(([key, skill]) => 
                                `<option value="${key}">${skill.label} (Rank ${skill.rank})</option>`
                            ).join("")
                        }</select>
                    </div>
                </form>
            `,
            buttons: {
                next: {
                    icon: '<i class="fas fa-arrow-right"></i>',
                    label: "Select Ring",
                    callback: (html) => {
                        const skill = html.find("#skillSelect").val();
                        this.openRingSelector(actor, skill);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "next"
        }).render(true);
    }

    static async openRingSelector(actor, skillKey) {
        const skill = actor.system.skills[skillKey];
        
        new Dialog({
            title: `${actor.name} - ${skill.label} - Select Ring`,
            content: `
                <form class="l5r5e-form">
                    <div class="form-group">
                        <label>Ring:</label>
                        <select id="ringSelect">
                            <option value="air">Air (${actor.system.rings.air.value})</option>
                            <option value="earth">Earth (${actor.system.rings.earth.value})</option>
                            <option value="fire">Fire (${actor.system.rings.fire.value})</option>
                            <option value="water">Water (${actor.system.rings.water.value})</option>
                            <option value="void">Void (${actor.system.rings.void.value})</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="explodeCheck" checked>
                            Explode Successes?
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="keepCheck">
                            Keep Strife Dice?
                        </label>
                    </div>
                </form>
            `,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice"></i>',
                    label: "Roll!",
                    callback: (html) => {
                        const ring = html.find("#ringSelect").val();
                        const explode = html.find("#explodeCheck").is(":checked");
                        const keepStrife = html.find("#keepCheck").is(":checked");
                        this.performRoll(actor, skillKey, ring, explode, keepStrife);
                    }
                },
                back: {
                    icon: '<i class="fas fa-arrow-left"></i>',
                    label: "Back",
                    callback: () => this.openSkillSelector(actor)
                }
            },
            default: "roll"
        }).render(true);
    }

    static async performRoll(actor, skillKey, ringKey, explode, keepStrife) {
        try {
            const skill = actor.system.skills[skillKey];
            const ring = actor.system.rings[ringKey];
            
            const rollFormula = `${ring.value + skill.rank}d6`;
            const roll = new Roll(rollFormula);
            await roll.evaluate({async: true});
            
            // Process results
            L5R5E.processDiceResults = (roll, explode) => {
    const results = {
        successes: 0,
        opportunities: 0,
        strife: 0,
        dice: roll.dice[0].results
    };
    
    results.dice.forEach(die => {
        if (die.result >= 5) results.successes++;
        if (die.result === 4) results.opportunities++;
        if (die.result === 1) results.strife++;
    });
    
    if (explode) {
        const sixes = results.dice.filter(d => d.result === 6).length;
        if (sixes > 0) {
            const explodeRoll = new Roll(`${sixes}d6`);
            await explodeRoll.evaluate({async: true});
            const explodeResults = this.processDiceResults(explodeRoll, false);
            
            results.successes += explodeResults.successes;
            results.opportunities += explodeResults.opportunities;
            results.strife += explodeResults.strife;
            results.dice = results.dice.concat(explodeResults.dice);
        }
    }
    
    return results;
};
            
            // Show dialog
            this.showResultsDialog(actor, skill.label, ringKey, roll, results, keepStrife);
            
        } catch (err) {
            console.error("L5R5E Roll Error:", err);
            ui.notifications.error("Roll failed!");
        }
    }

    static processDiceResults(roll, explode) {
        // Implementação da lógica de resultados
        // Retorna objeto com: successes, opportunities, strife, explodedDice
    }

    static showResultsDialog(actor, skillName, ringName, roll, results, keepStrife) {
        // Implementação da janela de resultados
    }
}

Hooks.once("init", () => L5R5ETokenRoller.init());
