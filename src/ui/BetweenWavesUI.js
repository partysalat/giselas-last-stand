/**
 * UI overlay displayed during between-waves fortification phase
 */
export class BetweenWavesUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.instructionText = null;
        this.visible = false;
    }

    /**
     * Create UI elements
     */
    create() {
        // Create container for all UI elements
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(100); // High depth to appear above everything

        // Semi-transparent background overlay
        const overlay = this.scene.add.rectangle(
            960, 540,
            1920, 1080,
            0x000000,
            0.3
        );
        this.container.add(overlay);

        // Title text
        const titleText = this.scene.add.text(
            960, 200,
            'FORTIFY YOUR DEFENSES',
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        titleText.setOrigin(0.5);
        this.container.add(titleText);

        // Instruction text
        this.instructionText = this.scene.add.text(
            960, 300,
            'Drag furniture to build barricades and set traps\n\nPress SPACE when ready to start the next wave',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        this.instructionText.setOrigin(0.5);
        this.container.add(this.instructionText);

        // Hide initially
        this.container.setVisible(false);
        this.visible = false;
    }

    /**
     * Show the UI overlay
     * @param {number} completedWave - Wave number just completed
     * @param {number} nextWave - Next wave number
     */
    show(completedWave, nextWave) {
        if (this.container) {
            // Update title with wave numbers
            const titleText = this.container.list[1]; // Title is second element
            if (titleText) {
                titleText.setText(`WAVE ${completedWave} COMPLETE`);
            }

            // Determine items for next wave
            let itemsText = 'Basic Furniture Available';
            if (nextWave >= 3) {
                itemsText = 'Furniture + Explosive Barrels Available';
            }
            if (nextWave >= 5) {
                itemsText = 'Full Arsenal Available (Barrels, Traps, Hazards)';
            }

            // Update instructions with next wave number and items
            if (this.instructionText) {
                this.instructionText.setText(
                    `${itemsText}\n\n` +
                    `Drag furniture to build barricades and set traps\n\n` +
                    `Wave ${nextWave} incoming...\n\n` +
                    `Press SPACE when ready`
                );
            }

            this.container.setVisible(true);
            this.visible = true;
        }
    }

    /**
     * Hide the UI overlay
     */
    hide() {
        if (this.container) {
            this.container.setVisible(false);
            this.visible = false;
        }
    }

    /**
     * Check if UI is visible
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Cleanup UI elements
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
