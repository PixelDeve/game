import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, setDoc, doc, serverTimestamp, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyBgQaeWlxecgunDZo8xHBorRVIrZ8K4YJ8",
            authDomain: "pixelbox-bca1b.firebaseapp.com",
            projectId: "pixelbox-bca1b",
            storageBucket: "pixelbox-bca1b.firebasestorage.app",
            messagingSenderId: "709778027442",
            appId: "1:709778027442:web:c2959397d3285e1f24eaab",
            measurementId: "G-8B9GQFDVY1"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const APP_ID = 'pixelbox_v1'; 

        const CHUNK_SIZE = 16;
        const RENDER_DIST = 3;
        const PLAYER_HEIGHT = 1.62;
        const PLAYER_RADIUS = 0.3;
        const DAY_LENGTH_SECONDS = 300; 
        
        let currentMineDelay = 400; 
        const MOVE_THRESHOLD = 15;

        let currentUser = null;
        let userId = 'Guest';
        let userDisplayName = 'Guest';
        let otherPlayers = {}; 
        let ATLAS_COLS = 8;
        let ATLAS_ROWS = 8;
        
        let coins = 0;
        let inventory = new Array(30).fill(null); 
        let deleteMode = false;
        let shopSellMode = false;
        let landClaims = {}; 
        let currentSkin = 'default';
        let ownedSkins = ['default']; // Default skin is always owned
        let activeTool = null;

        const TOOLS = {
            1001: { name: 'Wood Pick', tier: 1, price: 50, speedMod: 0.7, icon: 'wood_pick.png' },
            1002: { name: 'Stone Pick', tier: 2, price: 150, speedMod: 0.5, icon: 'stone_pick.png' },
            1003: { name: 'Iron Pick', tier: 3, price: 500, speedMod: 0.3, icon: 'iron_pick.png' },
            1004: { name: 'Diamond Pick', tier: 4, price: 1000, speedMod: 0.1, icon: 'diamond_pick.png' }
        };

        const SKINS = {
            'default': { name: 'Robot', price: 0, file: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb' },
            'blue': { name: 'Blue Bot', price: 200, file: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', color: 0x0000ff },
            'red': { name: 'Red Bot', price: 200, file: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', color: 0xff0000 },
            'gold': { name: 'Gold Bot', price: 1000, file: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', color: 0xFFD700 },
            'skin1': { name: 'Knight', price: 500, file: 'models/model1.glb', scale: 1.0 },
            'skin2': { name: 'Astronaut', price: 750, file: 'models/model2.glb', scale: 1.0 },
            'skin3': { name: 'Viking', price: 1000, file: 'models/model3.glb', scale: 1.0 }
        };

        const BLOCKS = {
            1: { name: 'Grass', price: 4, sellPrice: 1, files: ['grass_side.png', 'grass_side.png', 'grass_top.png', 'dirt.png', 'grass_side.png', 'grass_side.png'], hardness: 0.6 },
            2: { name: 'Dirt', price: 2, sellPrice: 1, files: ['dirt.png', 'dirt.png', 'dirt.png', 'dirt.png', 'dirt.png', 'dirt.png'], hardness: 0.5 },
            3: { name: 'Stone', price: 5, sellPrice: 2, files: ['stone.png', 'stone.png', 'stone.png', 'stone.png', 'stone.png', 'stone.png'], hardness: 1.5 },
            4: { name: 'Log', price: 5, sellPrice: 2, files: ['log_side.png', 'log_side.png', 'log_top.png', 'log_top.png', 'log_side.png', 'log_side.png'], hardness: 2.0 },
            5: { name: 'Leaves', price: 2, sellPrice: 1, files: ['leaves.png', 'leaves.png', 'leaves.png', 'leaves.png', 'leaves.png', 'leaves.png'], transparent: true, hardness: 0.2 },
            6: { name: 'Sand', price: 2, sellPrice: 1, files: ['sand.png', 'sand.png', 'sand.png', 'sand.png', 'sand.png', 'sand.png'], hardness: 0.5 },
            7: { name: 'Planks', price: 4, sellPrice: 1, files: ['planks.png', 'planks.png', 'planks.png', 'planks.png', 'planks.png', 'planks.png'], hardness: 2.0 },
            8: { name: 'Glass', price: 6, sellPrice: 2, files: ['glass.png', 'glass.png', 'glass.png', 'glass.png', 'glass.png', 'glass.png'], transparent: true, hardness: 0.3 },
            9: { name: 'Bedrock', files: ['bedrock.png', 'bedrock.png', 'bedrock.png', 'bedrock.png', 'bedrock.png', 'bedrock.png'], indestructible: true },
            10: { name: 'Torch', price: 5, sellPrice: 1, files: ['torch.png', 'torch.png', 'torch.png', 'torch.png', 'torch.png', 'torch.png'], isTorch: true, light: 0xFFA500, transparent: true, hardness: 0.1 },
            11: { name: 'Water', files: ['water.png', 'water.png', 'water.png', 'water.png', 'water.png', 'water.png'], transparent: true, isFluid: true, opacity: 0.7 },
            12: { name: 'Coal Ore', price: 10, sellPrice: 3, files: ['coal_ore.png', 'coal_ore.png', 'coal_ore.png', 'coal_ore.png', 'coal_ore.png', 'coal_ore.png'], hardness: 3.0 },
            13: { name: 'Iron Ore', price: 15, sellPrice: 4, files: ['iron_ore.png', 'iron_ore.png', 'iron_ore.png', 'iron_ore.png', 'iron_ore.png', 'iron_ore.png'], hardness: 3.0 },
            14: { name: 'Gold Ore', price: 20, sellPrice: 5, files: ['gold_ore.png', 'gold_ore.png', 'gold_ore.png', 'gold_ore.png', 'gold_ore.png', 'gold_ore.png'], hardness: 3.0 },
            15: { name: 'Diamond Ore', price: 30, sellPrice: 6, files: ['diamond_ore.png', 'diamond_ore.png', 'diamond_ore.png', 'diamond_ore.png', 'diamond_ore.png', 'diamond_ore.png'], hardness: 4.0 },
            16: { name: 'Emerald Ore', price: 30, sellPrice: 8, files: ['emerald_ore.png', 'emerald_ore.png', 'emerald_ore.png', 'emerald_ore.png', 'emerald_ore.png', 'emerald_ore.png'], hardness: 3.0 },
            17: { name: 'Cobblestone', price: 3, sellPrice: 1, files: ['cobblestone.png', 'cobblestone.png', 'cobblestone.png', 'cobblestone.png', 'cobblestone.png', 'cobblestone.png'], hardness: 2.0 },
            18: { name: 'Mossy Cobble', price: 4, sellPrice: 1, files: ['mossy_cobblestone.png', 'mossy_cobblestone.png', 'mossy_cobblestone.png', 'mossy_cobblestone.png', 'mossy_cobblestone.png', 'mossy_cobblestone.png'], hardness: 2.0 },
            19: { name: 'Stone Bricks', price: 4, sellPrice: 1, files: ['stone_bricks.png', 'stone_bricks.png', 'stone_bricks.png', 'stone_bricks.png', 'stone_bricks.png', 'stone_bricks.png'], hardness: 1.5 },
            20: { name: 'Obsidian', price: 40, sellPrice: 10, files: ['obsidian.png', 'obsidian.png', 'obsidian.png', 'obsidian.png', 'obsidian.png', 'obsidian.png'], hardness: 10.0 },
            21: { name: 'Gravel', price: 2, sellPrice: 1, files: ['gravel.png', 'gravel.png', 'gravel.png', 'gravel.png', 'gravel.png', 'gravel.png'], hardness: 0.6 },
            22: { name: 'Clay', price: 4, sellPrice: 2, files: ['clay.png', 'clay.png', 'clay.png', 'clay.png', 'clay.png', 'clay.png'], hardness: 0.6 },
            23: { name: 'Birch Log', price: 5, sellPrice: 2, files: ['birch_log.png', 'birch_log.png', 'birch_log_top.png', 'birch_log_top.png', 'birch_log.png', 'birch_log.png'], hardness: 2.0 },
            24: { name: 'Birch Planks', price: 4, sellPrice: 1, files: ['birch_planks.png', 'birch_planks.png', 'birch_planks.png', 'birch_planks.png', 'birch_planks.png', 'birch_planks.png'], hardness: 2.0 },
            25: { name: 'Spruce Log', price: 5, sellPrice: 2, files: ['spruce_log.png', 'spruce_log.png', 'spruce_log_top.png', 'spruce_log_top.png', 'spruce_log.png', 'spruce_log.png'], hardness: 2.0 },
            26: { name: 'Spruce Planks', price: 4, sellPrice: 1, files: ['spruce_planks.png', 'spruce_planks.png', 'spruce_planks.png', 'spruce_planks.png', 'spruce_planks.png', 'spruce_planks.png'], hardness: 2.0 },
            27: { name: 'White Wool', price: 6, sellPrice: 2, files: ['wool_white.png', 'wool_white.png', 'wool_white.png', 'wool_white.png', 'wool_white.png', 'wool_white.png'], hardness: 0.8 },
            28: { name: 'Red Wool', price: 6, sellPrice: 2, files: ['wool_red.png', 'wool_red.png', 'wool_red.png', 'wool_red.png', 'wool_red.png', 'wool_red.png'], hardness: 0.8 },
            29: { name: 'Green Wool', price: 6, sellPrice: 2, files: ['wool_green.png', 'wool_green.png', 'wool_green.png', 'wool_green.png', 'wool_green.png', 'wool_green.png'], hardness: 0.8 },
            30: { name: 'Blue Wool', price: 6, sellPrice: 2, files: ['wool_blue.png', 'wool_blue.png', 'wool_blue.png', 'wool_blue.png', 'wool_blue.png', 'wool_blue.png'], hardness: 0.8 },
            31: { name: 'Yellow Wool', price: 6, sellPrice: 2, files: ['wool_yellow.png', 'wool_yellow.png', 'wool_yellow.png', 'wool_yellow.png', 'wool_yellow.png', 'wool_yellow.png'], hardness: 0.8 },
            32: { name: 'Black Wool', price: 6, sellPrice: 2, files: ['wool_black.png', 'wool_black.png', 'wool_black.png', 'wool_black.png', 'wool_black.png', 'wool_black.png'], hardness: 0.8 },
            33: { name: 'Orange Wool', price: 6, sellPrice: 2, files: ['wool_orange.png', 'wool_orange.png', 'wool_orange.png', 'wool_orange.png', 'wool_orange.png', 'wool_orange.png'], hardness: 0.8 },
            34: { name: 'Furnace', price: 16, sellPrice: 4, files: ['furnace_side.png', 'furnace_side.png', 'furnace_top.png', 'furnace_top.png', 'furnace_front.png', 'furnace_side.png'], hardness: 3.5 },
            35: { name: 'Crafting Table', price: 10, sellPrice: 3, files: ['crafting_side.png', 'crafting_side.png', 'crafting_top.png', 'planks.png', 'crafting_side.png', 'crafting_side.png'], hardness: 2.5 },
            36: { name: 'Bookshelf', price: 15, sellPrice: 4, files: ['bookshelf.png', 'bookshelf.png', 'planks.png', 'planks.png', 'bookshelf.png', 'bookshelf.png'], hardness: 1.5 },
            37: { name: 'TNT', price: 50, sellPrice: 10, files: ['tnt_side.png', 'tnt_side.png', 'tnt_top.png', 'tnt_bottom.png', 'tnt_side.png', 'tnt_side.png'], hardness: 0.0 },
            38: { name: 'Pumpkin', price: 8, sellPrice: 2, files: ['pumpkin_side.png', 'pumpkin_side.png', 'pumpkin_top.png', 'pumpkin_top.png', 'pumpkin_face.png', 'pumpkin_side.png'], hardness: 1.0 },
            39: { name: 'Melon', price: 8, sellPrice: 2, files: ['melon_side.png', 'melon_side.png', 'melon_top.png', 'melon_top.png', 'melon_side.png', 'melon_side.png'], hardness: 1.0 },
            40: { name: 'Cyan Wool', price: 6, sellPrice: 2, files: ['wool_cyan.png', 'wool_cyan.png', 'wool_cyan.png', 'wool_cyan.png', 'wool_cyan.png', 'wool_cyan.png'], hardness: 0.8 },
            41: { name: 'Purple Wool', price: 6, sellPrice: 2, files: ['wool_purple.png', 'wool_purple.png', 'wool_purple.png', 'wool_purple.png', 'wool_purple.png', 'wool_purple.png'], hardness: 0.8 },
            42: { name: 'Pink Wool', price: 6, sellPrice: 2, files: ['wool_pink.png', 'wool_pink.png', 'wool_pink.png', 'wool_pink.png', 'wool_pink.png', 'wool_pink.png'], hardness: 0.8 },
            43: { name: 'Lime Wool', price: 6, sellPrice: 2, files: ['wool_lime.png', 'wool_lime.png', 'wool_lime.png', 'wool_lime.png', 'wool_lime.png', 'wool_lime.png'], hardness: 0.8 },
            44: { name: 'Snow Block', price: 2, sellPrice: 1, files: ['snow.png', 'snow.png', 'snow.png', 'snow.png', 'snow.png', 'snow.png'], hardness: 0.2 },
            45: { name: 'Ice', price: 4, sellPrice: 1, files: ['ice.png', 'ice.png', 'ice.png', 'ice.png', 'ice.png', 'ice.png'], transparent: true, opacity: 0.6, hardness: 0.5 },
            46: { name: 'Cactus', price: 4, sellPrice: 1, files: ['cactus_side.png', 'cactus_side.png', 'cactus_top.png', 'cactus_bottom.png', 'cactus_side.png', 'cactus_side.png'], transparent: true, hardness: 0.4 },
            47: { name: 'Mycelium', price: 4, sellPrice: 1, files: ['mycelium_side.png', 'mycelium_side.png', 'mycelium_top.png', 'dirt.png', 'mycelium_side.png', 'mycelium_side.png'], hardness: 0.6 },
            48: { name: 'Netherrack', price: 2, sellPrice: 1, files: ['netherrack.png', 'netherrack.png', 'netherrack.png', 'netherrack.png', 'netherrack.png', 'netherrack.png'], hardness: 0.4 },
            49: { name: 'Soul Sand', price: 4, sellPrice: 1, files: ['soul_sand.png', 'soul_sand.png', 'soul_sand.png', 'soul_sand.png', 'soul_sand.png', 'soul_sand.png'], hardness: 0.5 },
            50: { name: 'Glowstone', price: 16, sellPrice: 4, files: ['glowstone.png', 'glowstone.png', 'glowstone.png', 'glowstone.png', 'glowstone.png', 'glowstone.png'], light: 0xFFFFFF, hardness: 0.3 },
            51: { name: 'End Stone', price: 10, sellPrice: 3, files: ['end_stone.png', 'end_stone.png', 'end_stone.png', 'end_stone.png', 'end_stone.png', 'end_stone.png'], hardness: 3.0 },
            52: { name: 'Iron Block', price: 100, sellPrice: 15, files: ['iron_block.png', 'iron_block.png', 'iron_block.png', 'iron_block.png', 'iron_block.png', 'iron_block.png'], hardness: 5.0 },
            53: { name: 'Gold Block', price: 150, sellPrice: 25, files: ['gold_block.png', 'gold_block.png', 'gold_block.png', 'gold_block.png', 'gold_block.png', 'gold_block.png'], hardness: 3.0 },
            54: { name: 'Diamond Block', price: 500, sellPrice: 20, files: ['diamond_block.png', 'diamond_block.png', 'diamond_block.png', 'diamond_block.png', 'diamond_block.png', 'diamond_block.png'], hardness: 5.0 },
            55: { name: 'Brick', price: 6, sellPrice: 2, files: ['brick.png', 'brick.png', 'brick.png', 'brick.png', 'brick.png', 'brick.png'], hardness: 2.0 },
            56: { name: 'Sandstone', price: 4, sellPrice: 1, files: ['sandstone_side.png', 'sandstone_side.png', 'sandstone_top.png', 'sandstone_bottom.png', 'sandstone_side.png', 'sandstone_side.png'], hardness: 0.8 },
            57: { name: 'Quartz', price: 10, sellPrice: 3, files: ['quartz_side.png', 'quartz_side.png', 'quartz_top.png', 'quartz_bottom.png', 'quartz_side.png', 'quartz_side.png'], hardness: 0.8 },
            58: { name: 'Grey Wool', price: 6, sellPrice: 2, files: ['wool_grey.png', 'wool_grey.png', 'wool_grey.png', 'wool_grey.png', 'wool_grey.png', 'wool_grey.png'], hardness: 0.8 },
            59: { name: 'Lt Grey Wool', price: 6, sellPrice: 2, files: ['wool_light_grey.png', 'wool_light_grey.png', 'wool_light_grey.png', 'wool_light_grey.png', 'wool_light_grey.png', 'wool_light_grey.png'], hardness: 0.8 },
            60: { name: 'Magenta Wool', price: 6, sellPrice: 2, files: ['wool_magenta.png', 'wool_magenta.png', 'wool_magenta.png', 'wool_magenta.png', 'wool_magenta.png', 'wool_magenta.png'], hardness: 0.8 },
            61: { name: 'Light Blue Wool', price: 6, sellPrice: 2, files: ['wool_light_blue.png', 'wool_light_blue.png', 'wool_light_blue.png', 'wool_light_blue.png', 'wool_light_blue.png', 'wool_light_blue.png'], hardness: 0.8 },
            62: { name: 'Sponge', price: 10, sellPrice: 2, files: ['sponge.png', 'sponge.png', 'sponge.png', 'sponge.png', 'sponge.png', 'sponge.png'], hardness: 0.6 },
            63: { name: 'Redstone Lamp', price: 16, sellPrice: 4, files: ['redstone_lamp_off.png', 'redstone_lamp_off.png', 'redstone_lamp_off.png', 'redstone_lamp_off.png', 'redstone_lamp_off.png', 'redstone_lamp_off.png'], hardness: 0.3 },
            64: { name: 'Hay Bale', price: 4, sellPrice: 1, files: ['hay_side.png', 'hay_side.png', 'hay_top.png', 'hay_top.png', 'hay_side.png', 'hay_side.png'], hardness: 0.5 },
            100: { name: 'Claim Block', price: 500, sellPrice: 50, files: ['sponge.png', 'sponge.png', 'sponge.png', 'sponge.png', 'sponge.png', 'sponge.png'], hardness: 5.0 }
        };

        let scene, camera, renderer, raycaster, atlas, sunLight, ambientLight, clouds, stars;
        let playerGroup, externalModel, cameraPivot, modelLoaded = false;
        let world = {}, chunkMeshes = {}, clickables = [];
        let activeTorches = []; 

        let vel = new THREE.Vector3(), onGround = false, gameTime = 0, running = false, paused = false;
        let isTouch = 'ontouchstart' in window;
        let activeHotbarIndex = 0;
        let hotbarSlots = [0, 0, 0, 0, 0, 0, 0, 0];
        let selectionBox;
        const keys = {}, joy = { x: 0, y: 0, id: null, sx: 0, sy: 0 };
        const touchState = { id: null, lx: 0, ly: 0, sx: 0, sy: 0, timer: null, moved: false, startTime: 0 };

        let isFlying = false, lastJumpTime = 0, isTouchingDown = false, isTouchingUp = false, povMode = 0, povDist = 4;
        let mixer, actions = {}, activeAction;

        function makeTextSprite(message) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;
            
            context.font = "Bold 40px sans-serif";
            context.fillStyle = "rgba(0,0,0,0.5)";
            const metrics = context.measureText(message);
            const textWidth = metrics.width;
            
            context.beginPath();
            context.roundRect(256 - textWidth/2 - 15, 40, textWidth + 30, 50, 10);
            context.fill();
            
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = "white";
            context.strokeStyle = "black";
            context.lineWidth = 4;
            context.strokeText(message, 256, 65);
            context.fillText(message, 256, 65);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(2, 0.5, 1);
            return sprite;
        }

        function initNetwork() {
            const playersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'players');
            onSnapshot(playersRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    const pid = change.doc.id;
                    if (pid === userId) return; 
                    if (change.type === "added" || change.type === "modified") {
                        if (!otherPlayers[pid]) createRemotePlayer(pid, data);
                        updateRemotePlayer(pid, data);
                    }
                    if (change.type === "removed") removeRemotePlayer(pid);
                });
            });

            const claimsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'claims');
            onSnapshot(claimsRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if(change.type === "added") {
                        const d = change.doc.data();
                        landClaims[change.doc.id] = d.owner;
                    }
                });
            });

            const worldRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'world_changes');
            const q = query(worldRef, orderBy('timestamp', 'asc'));
            
            onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const d = change.doc.data();
                        const key = `${Math.floor(d.x)},${Math.floor(d.y)},${Math.floor(d.z)}`;
                        if (d.action === 'PLACE') {
                            world[key] = d.id;
                            if (d.id === 10) activeTorches.push({x:d.x, y:d.y, z:d.z, k:key});
                        } else if (d.action === 'BREAK') {
                            world[key] = 0;
                            if (d.prevId === 10) activeTorches = activeTorches.filter(t => t.k !== key);
                        }
                        if (running) refreshChunk(d.x, d.z);
                    }
                });
            });

            const chatRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat');
            const chatQ = query(chatRef, orderBy('timestamp', 'desc'), limit(20));
            onSnapshot(chatQ, (snapshot) => {
                const log = document.getElementById('chat-log');
                const msgs = [];
                snapshot.forEach(doc => msgs.push(doc.data()));
                msgs.reverse();
                log.innerHTML = '';
                msgs.forEach(m => {
                    const el = document.createElement('div');
                    el.innerHTML = `<span style="color:#0f0">[${m.user.substr(0,8)}]</span>: ${m.text}`;
                    log.appendChild(el);
                });
                log.scrollTop = log.scrollHeight;
            });

            window.addEventListener('beforeunload', () => {
                if (currentUser) {
                    deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'players', userId));
                }
            });
        }

        let lastNetworkUpdate = 0;
        function updateNetworkLoop() {
            if (!currentUser || !running) return;
            const now = Date.now();
            if (now - lastNetworkUpdate > 100) {
                lastNetworkUpdate = now;
                const playerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'players', userId);
                setDoc(playerRef, {
                    x: playerGroup.position.x,
                    y: playerGroup.position.y,
                    z: playerGroup.position.z,
                    ry: playerGroup.rotation.y,
                    name: userDisplayName,
                    moving: Math.hypot(vel.x || 0, vel.z || 0) > 0.1,
                    skin: currentSkin,
                    lastSeen: serverTimestamp()
                }, { merge: true });
            }
        }

        function createRemotePlayer(pid, data) {
            const group = new THREE.Group();
            let model;
            let pMixer, pActions = {};
            
            const skinData = SKINS[data.skin || 'default'];
            
            // OPTIMIZATION: If default robot, clone existing to avoid re-downloading
            if ((!data.skin || data.skin === 'default') && modelLoaded && externalModel) {
                model = THREE.SkeletonUtils.clone(externalModel);
                model.position.y = -PLAYER_HEIGHT; // Fix height
                model.traverse(n => { 
                    if(n.isMesh) { 
                        n.castShadow = true; n.receiveShadow = true; 
                        if (skinData && skinData.color) {
                             if(n.material) n.material = n.material.clone();
                             if(n.material.color) n.material.color.setHex(skinData.color);
                        }
                    } 
                });
                group.add(model);
                
                pMixer = new THREE.AnimationMixer(model);
                const originalAnimations = externalModel.animations || [];
                originalAnimations.forEach(clip => {
                    let n = clip.name;
                    if (n === 'Skeleton|Idle' || n === 'Idle') n = 'Idle';
                    else if (n === 'Skeleton|Walking' || n === 'Walking') n = 'Walking';
                    else if (n.toLowerCase().includes('idle')) n = 'Idle';
                    else if (n.toLowerCase().includes('walk') && !n.toLowerCase().includes('jump')) n = 'Walking';
                    
                    if (!pActions[n]) pActions[n] = pMixer.clipAction(clip);
                });
                if(pActions['Idle']) pActions['Idle'].play();
            } else if (skinData && skinData.file) {
                // Custom skin or clone failed - Load it
                // Add placeholder box while loading
                const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), new THREE.MeshLambertMaterial({color: 0x888888}));
                placeholder.position.y = -0.8;
                group.add(placeholder);

                // Handle default skin URL safety if passed as raw string
                let url = skinData.file;
                if (data.skin === 'default' && !url.startsWith('http')) {
                     url = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
                }

                new THREE.GLTFLoader().load(url, (gltf) => {
                    group.remove(placeholder);
                    model = gltf.scene;
                    
                    // Fixed scaling and animation normalization for custom skins
                    if (skinData.scale) {
                        model.scale.set(skinData.scale, skinData.scale, skinData.scale);
                    } else {
                        const bbox = new THREE.Box3().setFromObject(model);
                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        const h = size.y;
                        const targetH = 2.0; 
                        if (h > 0) {
                            const s = targetH / h;
                            model.scale.set(s, s, s);
                        } else {
                            model.scale.set(0.4, 0.4, 0.4);
                        }
                    }
                    
                    model.position.y = -PLAYER_HEIGHT;
                    model.traverse(n => { 
                        if(n.isMesh) { 
                            n.castShadow = true; n.receiveShadow = true; 
                            if (skinData.color) {
                                if(n.material) n.material = n.material.clone();
                                if(n.material.color) n.material.color.setHex(skinData.color);
                            }
                        } 
                    });
                    group.add(model);
                    pMixer = new THREE.AnimationMixer(model);
                    
                    // Rename animations for specific GLB structure and consistency
                    gltf.animations.forEach(clip => { 
                        let n = clip.name;
                        if (n === 'Skeleton|Idle' || n === 'Idle') n = 'Idle';
                        else if (n === 'Skeleton|Walking' || n === 'Walking') n = 'Walking';
                        else if (n.toLowerCase().includes('idle')) n = 'Idle';
                        else if (n.toLowerCase().includes('walk') && !n.toLowerCase().includes('jump')) n = 'Walking';
                        
                        if (!pActions[n]) pActions[n] = pMixer.clipAction(clip); 
                    });
                    
                    if(pActions['Idle']) pActions['Idle'].play();
                    
                    if(otherPlayers[pid]) {
                        otherPlayers[pid].mixer = pMixer;
                        otherPlayers[pid].actions = pActions;
                    }
                }, undefined, (error) => {
                    console.error("Failed to load model for player " + pid, error);
                    // Keep placeholder if failed
                });
            } else {
                // Fallback box
                model = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), new THREE.MeshLambertMaterial({color: 0x00ff00}));
                model.position.y = -0.8;
                model.castShadow = true; model.receiveShadow = true;
                group.add(model);
            }

            const nameTag = makeTextSprite(data.name || pid.substr(0, 8));
            nameTag.position.y = 0.5;
            group.add(nameTag);

            scene.add(group);
            const p = { 
                group, 
                model, 
                nameTag,
                mixer: pMixer, 
                actions: pActions,
                currentAction: 'Idle',
                targetPos: new THREE.Vector3(data.x, data.y, data.z), 
                targetRot: data.ry,
                data: data,
                lastSeenTime: Date.now()
            };
            otherPlayers[pid] = p;
            group.position.set(data.x, data.y, data.z);
        }

        function updateRemotePlayer(pid, data) {
            const p = otherPlayers[pid];
            if (!p) return;
            p.targetPos.set(data.x, data.y, data.z);
            p.targetRot = data.ry;
            // Update timestamp whenever we receive data from Firebase
            p.lastSeenTime = Date.now();
            p.data = data;
            
            if (p.mixer) {
                const isMoving = data.moving || p.targetPos.distanceTo(p.group.position) > 0.05;
                const nextAction = isMoving ? 'Walking' : 'Idle';
                if (p.currentAction !== nextAction) {
                    if (p.actions[p.currentAction]) p.actions[p.currentAction].fadeOut(0.2);
                    if (p.actions[nextAction]) p.actions[nextAction].reset().fadeIn(0.2).play();
                    p.currentAction = nextAction;
                }
            }
        }

        function removeRemotePlayer(pid) {
            if (otherPlayers[pid]) {
                const p = otherPlayers[pid];
                scene.remove(p.group);
                p.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                });
                delete otherPlayers[pid];
            }
        }

        function updateRemotePlayersVisuals(dt) {
            const now = Date.now();
            const TIMEOUT_THRESHOLD = 10000; // 10 seconds of no data = offline

            for (let pid in otherPlayers) {
                const p = otherPlayers[pid];
                
                // If player hasn't updated in 10s, remove them
                if (now - p.lastSeenTime > TIMEOUT_THRESHOLD) {
                    removeRemotePlayer(pid);
                    continue;
                }

                p.group.position.lerp(p.targetPos, 10 * dt);
                p.group.rotation.y = THREE.MathUtils.lerp(p.group.rotation.y, p.targetRot, 10 * dt);
                if (p.mixer) p.mixer.update(dt);
            }
        }

        function broadcastAction(type, data) { 
            if (!currentUser) return;
            if (type === 'PLACE' || type === 'BREAK') {
                addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'world_changes'), {
                    ...data,
                    author: userId,
                    timestamp: serverTimestamp(),
                    action: type
                });
            } else if (type === 'CHAT') {
                addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'chat'), {
                    user: userDisplayName,
                    text: data.text,
                    timestamp: serverTimestamp()
                });
            }
        }

        function hash(x, z) { let h = (x * 374761393) ^ (z * 668265263); h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }

        function saveGame() {
            localStorage.setItem('voxel_prefs_client', JSON.stringify({ povMode }));
            if (currentUser && userId) {
                const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_stats', userId);
                setDoc(userRef, {
                    inventory: inventory,
                    coins: coins,
                    currentSkin: currentSkin,
                    ownedSkins: ownedSkins,
                    activeTool: activeTool
                }, { merge: true });
            }
        }

        async function loadGame() {
            const localData = localStorage.getItem('voxel_prefs_client');
            if(localData) {
                const parsed = JSON.parse(localData);
                povMode = parsed.povMode ?? 0;
            }
            if(currentUser && userId) {
                const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'user_stats', userId);
                try {
                    const snap = await getDoc(userRef);
                    if(snap.exists()) {
                        const saved = snap.data();
                        inventory = saved.inventory || inventory;
                        coins = saved.coins || 0;
                        currentSkin = saved.currentSkin || 'default';
                        ownedSkins = saved.ownedSkins || ['default'];
                        activeTool = saved.activeTool || null;
                    }
                } catch(e) { console.error(e); }
            }
            updateHotbarFromInventory();
            updateCoinDisplay();
        }

        async function createAtlas() {
            const S = 32;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const uniqueFiles = [...new Set(Object.values(BLOCKS).flatMap(b => b.files || []))];
            const count = uniqueFiles.length;

            ATLAS_COLS = 8;
            ATLAS_ROWS = Math.max(1, Math.ceil(count / ATLAS_COLS));

            canvas.width = S * ATLAS_COLS;
            canvas.height = S * ATLAS_ROWS;

            const fileToId = {};

            // Simple in-memory cache across page lifetime to avoid refetching/decoding images
            const imageCache = window.__voxelImgCache = window.__voxelImgCache || new Map();

            const loadTile = async (file, index) => {
                const tx = (index % ATLAS_COLS) * S;
                const ty = Math.floor(index / ATLAS_COLS) * S;
                const url = new URL(`./assets/${file}`, window.location.href).href;

                // Use cached ImageBitmap if available
                if (imageCache.has(url)) {
                    const bmp = imageCache.get(url);
                    if (bmp) ctx.drawImage(bmp, tx, ty, S, S);
                    else {
                        // placeholder for failed image
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(tx, ty, S, S);
                        ctx.fillStyle = '#FF00FF';
                        ctx.fillRect(tx + S/4, ty + S/4, S/2, S/2);
                    }
                    return;
                }

                try {
                    // Prefer fetch + createImageBitmap for faster decoding on many browsers
                    const resp = await fetch(url, { mode: 'cors' });
                    if (!resp.ok) throw new Error('Image fetch failed');
                    const blob = await resp.blob();
                    // createImageBitmap is faster and can off-main-thread in some browsers
                    const bmp = await createImageBitmap(blob);
                    imageCache.set(url, bmp);
                    ctx.drawImage(bmp, tx, ty, S, S);
                } catch (e) {
                    // mark as failed to avoid retry storms
                    imageCache.set(url, null);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(tx, ty, S, S);
                    ctx.fillStyle = '#FF00FF';
                    ctx.fillRect(tx + S/4, ty + S/4, S/2, S/2);
                }
            };

            // Build atlas sequentially to avoid massive parallel fetches on low-end devices
            for (let i = 0; i < count; i++) {
                await loadTile(uniqueFiles[i], i);
                fileToId[uniqueFiles[i]] = i;
            }

            // Assign tile indices back to block definitions
            Object.values(BLOCKS).forEach(b => {
                if (b.files) {
                    b.tiles = b.files.map(f => fileToId[f]);
                }
            });

            // Create a Three.js texture from the canvas. Keep nearest filtering for crisp voxel look.
            const tex = new THREE.CanvasTexture(canvas);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;

            // Expose canvas for UI code that expects atlas.image (backwards compatible)
            tex.__atlasCanvas = canvas;
            window.__voxelAtlasCanvas = canvas;

            return tex;
        }

        function getBlock(x, y, z) {
            const k = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
            if(world[k] !== undefined) return world[k];
            if(y < 0) return 0;
            if(y === 0) return 9;
            const h = Math.floor(10 + Math.sin(x*0.05 + z*0.03)*4 + Math.cos(x*0.03 - z*0.05)*3);
            for (let tx = -2; tx <= 2; tx++) {
                for (let tz = -2; tz <= 2; tz++) {
                    const wx = Math.floor(x) - tx; const wz = Math.floor(z) - tz;
                    const th = Math.floor(10 + Math.sin(wx*0.05 + wz*0.03)*4 + Math.cos(wx*0.03 - wz*0.05)*3);
                    if (th >= 7 && hash(wx, wz) % 100 < 2) {
                        const relX = Math.floor(x) - wx; const relZ = Math.floor(z) - wz; const relY = Math.floor(y) - th;
                        if (relX === 0 && relZ === 0 && relY > 0 && relY <= 5) return 4;
                        if (relY >= 4 && relY <= 6) {
                            const dist = Math.abs(relX) + Math.abs(relZ) + Math.abs(relY - 5);
                            if (dist <= 2 && !(relX === 0 && relZ === 0 && relY <= 5)) return 5;
                        }
                    }
                }
            }
            if(y > h) return 0;
            if(y === h) return (h < 7) ? 6 : 1;
            
            if(y < h - 3) {
                const rand = hash(x, y * z) % 10000;
                if (rand < 1) return 54; 
                if (rand < 5) return 15; 
                if (rand < 20) return 14; 
                if (rand < 60) return 13; 
                if (rand < 150) return 12; 
            }

            return (y > h - 3) ? 2 : 3;
        }

        function buildChunk(cx, cz) {
            const pos=[], norm=[], uv=[], color=[], idx=[];
            let count = 0;
            for(let x=0; x<CHUNK_SIZE; x++) {
                for(let z=0; z<CHUNK_SIZE; z++) {
                    for(let y=0; y<32; y++) {
                        const wx = cx*CHUNK_SIZE+x, wz = cz*CHUNK_SIZE+z;
                        const type = getBlock(wx, y, wz);
                        if(type === 0 || !BLOCKS[type]) continue;
                        const isTorch = BLOCKS[type].isTorch;
                        const faces = [
                            { n:[1,0,0],  v:[1,0,0, 1,1,0, 1,1,1, 1,0,1], ao:0.8 },
                            { n:[-1,0,0], v:[0,0,1, 0,1,1, 0,1,0, 0,0,0], ao:0.8 },
                            { n:[0,1,0],  v:[0,1,1, 1,1,1, 1,1,0, 0,1,0], ao:1.0 },
                            { n:[0,-1,0], v:[0,0,0, 1,0,0, 1,0,1, 0,0,1], ao:0.5 },
                            { n:[0,0,1],  v:[1,0,1, 1,1,1, 0,1,1, 0,0,1], ao:0.9 },
                            { n:[0,0,-1], v:[0,0,0, 0,1,0, 1,1,0, 1,0,0], ao:0.9 }
                        ];
                        faces.forEach((f, fi) => {
                            const nType = getBlock(wx+f.n[0], y+f.n[1], wz+f.n[2]);
                            if (!isTorch) if(nType !== 0 && (!BLOCKS[nType].transparent || nType === type)) return;
                            for(let i=0; i<4; i++) {
                                let vx = f.v[i*3], vy = f.v[i*3+1], vz = f.v[i*3+2];
                                if(isTorch) { vx = 0.4375 + vx*0.125; vy = vy*0.625; vz = 0.4375 + vz*0.125; }
                                pos.push(wx+vx, y+vy, wz+vz); norm.push(...f.n); 
                                if(isTorch) color.push(1.5, 1.3, 1.0); else color.push(f.ao, f.ao, f.ao);
                            }
                            const tIdx = BLOCKS[type].tiles[fi];
                            const u = (tIdx % ATLAS_COLS) / ATLAS_COLS;
                            const v = 1 - (Math.floor(tIdx / ATLAS_COLS) + 1) / ATLAS_ROWS;
                            const uStep = 1 / ATLAS_COLS;
                            const vStep = 1 / ATLAS_ROWS;
                            
                            uv.push(u, v, u, v + vStep, u + uStep, v + vStep, u + uStep, v);
                            idx.push(count, count+1, count+2, count, count+2, count+3);
                            count += 4;
                        });
                    }
                }
            }
            if(count === 0) return null;
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
            geo.setIndex(idx);
            const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, alphaTest: 0.1 }));
            mesh.castShadow = true; 
            mesh.receiveShadow = true;
            return mesh;
        }

        function refreshChunk(wx, wz) {
            const cx = Math.floor(wx/CHUNK_SIZE), cz = Math.floor(wz/CHUNK_SIZE);
            const k = `${cx},${cz}`;
            if(chunkMeshes[k]) { scene.remove(chunkMeshes[k]); clickables = clickables.filter(c => c !== chunkMeshes[k]); delete chunkMeshes[k]; }
            const m = buildChunk(cx, cz);
            if(m) { scene.add(m); clickables.push(m); chunkMeshes[k] = m; }
        }

        function interact(place) {
            raycaster.setFromCamera({x:0, y:0}, camera);
            const hits = raycaster.intersectObjects(clickables);
            if(hits.length > 0) {
                const h = hits[0], n = h.face.normal;
                const bx = Math.floor(h.point.x - n.x*0.05), by = Math.floor(h.point.y - n.y*0.05), bz = Math.floor(h.point.z - n.z*0.05);
                const pbx = Math.floor(h.point.x + n.x*0.05), pby = Math.floor(h.point.y + n.y*0.05), pbz = Math.floor(h.point.z + n.z*0.05);
                
                const chunkKey = `${Math.floor(place ? pbx : bx) >> 4},${Math.floor(place ? pbz : bz) >> 4}`;
                if (landClaims[chunkKey] && landClaims[chunkKey] !== userId) {
                    broadcastAction('CHAT', { text: "This land is claimed by " + landClaims[chunkKey] });
                    return false;
                }

                if(place) {
                    const item = inventory[activeHotbarIndex];
                    if(!item || item.count <= 0) return false;
                    const id = item.id;
                    if(id === 0 || getBlock(pbx, pby, pbz) !== 0) return false;
                    const px = playerGroup.position.x, py = playerGroup.position.y, pz = playerGroup.position.z;
                    if(px + PLAYER_RADIUS > pbx && px - PLAYER_RADIUS < pbx + 1 && pz + PLAYER_RADIUS > pbz && pz - PLAYER_RADIUS < pbz + 1 && py > pby && py - PLAYER_HEIGHT < pby + 1) return false;
                    
                    item.count--;
                    if(item.count <= 0) inventory[activeHotbarIndex] = null;
                    updateHotbarFromInventory();
                    updateUI();

                    const k = `${pbx},${pby},${pbz}`;
                    world[k] = id; if(id === 10) activeTorches.push({x:pbx, y:pby, z:pbz, k});
                    
                    if (id === 100) {
                        setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'claims', chunkKey), {
                            owner: userId,
                            x: pbx, z: pbz
                        });
                        landClaims[chunkKey] = userId;
                        // Place Red Wool Markers
                        const cx = Math.floor(pbx) >> 4;
                        const cz = Math.floor(pbz) >> 4;
                        const corners = [
                            {x: cx*16, z: cz*16},
                            {x: cx*16+15, z: cz*16},
                            {x: cx*16, z: cz*16+15},
                            {x: cx*16+15, z: cz*16+15}
                        ];
                        corners.forEach(c => {
                            const ck = `${c.x},${pby},${c.z}`;
                            world[ck] = 28; // Red Wool
                            broadcastAction('PLACE', { x: c.x, y: pby, z: c.z, id: 28 });
                        });
                        refreshChunk(cx*16, cz*16);
                    }

                    refreshChunk(pbx, pbz);
                    broadcastAction('PLACE', { x: pbx, y: pby, z: pbz, id });
                } else {
                    const type = getBlock(bx, by, bz);
                    // Prevent breaking red wool markers if active claim
                    if (type === 28) {
                        const cx = Math.floor(bx) >> 4;
                        const cz = Math.floor(bz) >> 4;
                        const ck = `${cx},${cz}`;
                        if (landClaims[ck]) {
                            const isCorner = (bx % 16 === 0 || bx % 16 === 15) && (bz % 16 === 0 || bz % 16 === 15);
                            if (isCorner) return false;
                        }
                    }

                    if(type === 0 || BLOCKS[type]?.indestructible) return false;
                    
                    let added = false;
                    for(let i=0; i<30; i++) { if(inventory[i] && inventory[i].id === type) { inventory[i].count++; added = true; break; } }
                    if(!added) { for(let i=0; i<30; i++) { if(!inventory[i]) { inventory[i] = {id: type, count: 1}; break; } } }
                    updateHotbarFromInventory();
                    updateUI();

                    const k = `${bx},${by},${bz}`;
                    world[k] = 0; 
                    if(type === 10) activeTorches = activeTorches.filter(t => t.k !== k);
                    
                    // Unclaim Logic
                    if (type === 100) {
                        deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'claims', chunkKey));
                        delete landClaims[chunkKey];
                        // Remove Markers
                        const cx = Math.floor(bx) >> 4;
                        const cz = Math.floor(bz) >> 4;
                        const corners = [
                            {x: cx*16, z: cz*16},
                            {x: cx*16+15, z: cz*16},
                            {x: cx*16, z: cz*16+15},
                            {x: cx*16+15, z: cz*16+15}
                        ];
                        corners.forEach(c => {
                            const ck = `${c.x},${by},${c.z}`;
                            if(world[ck] === 28) {
                                world[ck] = 0;
                                broadcastAction('BREAK', { x: c.x, y: by, z: c.z, prevId: 28 });
                            }
                        });
                        refreshChunk(cx*16, cz*16);
                    }

                    refreshChunk(bx, bz);
                    broadcastAction('BREAK', { x: bx, y: by, z: bz, prevId: type });
                }
                saveGame();
                return true;
            }
            return false;
        }

        function checkCol(p) {
            const r = PLAYER_RADIUS;
            for(let y = Math.floor(p.y - PLAYER_HEIGHT); y <= Math.floor(p.y + 0.1); y++) {
                for(let x = Math.floor(p.x - r); x <= Math.floor(p.x + r); x++) {
                    for(let z = Math.floor(p.z - r); z <= Math.floor(p.z + r); z++) {
                        const b = getBlock(x, y, z);
                        if(b !== 0 && b !== 11 && b !== 10) return true;
                    }
                }
            }
            return false;
        }

        function handleJumpTap() {
            const now = Date.now();
            if (now - lastJumpTime < 300) {
                isFlying = !isFlying;
                document.getElementById('up-btn').style.display = isFlying ? 'flex' : 'none';
                document.getElementById('down-btn').style.display = isFlying ? 'flex' : 'none';
                vel.y = 0;
            } else if(!isFlying && onGround) vel.y = 9;
            lastJumpTime = now;
        }

        function updatePOV() {
            raycaster.far = (povMode === 0) ? 5 : 12;
            if (povMode === 0) {
                camera.position.set(0, 0, 0); camera.rotation.y = 0;
                if(externalModel) externalModel.visible = false;
            } else if (povMode === 1) {
                camera.position.set(0.8, 0.5, povDist); camera.rotation.y = 0;
                if(externalModel) externalModel.visible = true;
            } else {
                camera.position.set(0, 0.5, -povDist); camera.rotation.y = Math.PI;
                if(externalModel) externalModel.visible = true;
            }
        }

        function fadeToAction(name, duration) {
            if (!actions[name]) return;
            const previousAction = activeAction;
            activeAction = actions[name];
            if (previousAction !== activeAction) {
                if (previousAction) previousAction.fadeOut(duration);
                activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
            }
        }

        function toggleChat() {
            const container = document.getElementById('chat-container');
            const isOpening = container.style.display !== 'flex';
            container.style.display = isOpening ? 'flex' : 'none';
            if (isOpening) { document.getElementById('chat-input').focus(); if(document.pointerLockElement) document.exitPointerLock(); } 
            else if(!isTouch && !paused) document.body.requestPointerLock();
        }

        function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (text) { 
                if (text === '/home') {
                    const claims = Object.keys(landClaims).filter(k => landClaims[k] === userId);
                    if (claims.length > 0) {
                        const [cx, cz] = claims[0].split(',').map(Number);
                        playerGroup.position.set(cx * 16 + 8, 30, cz * 16 + 8);
                        vel.y = 0;
                    } else {
                        broadcastAction('CHAT', { text: "No land claimed." });
                    }
                } else {
                    broadcastAction('CHAT', { text }); 
                }
                input.value = ''; 
            }
        }

        function setupInput() {
            document.getElementById('inv-btn').onclick = (e) => { e.stopPropagation(); toggleInventory(); };
            document.getElementById('close-inv').onclick = () => toggleInventory();
            document.getElementById('chat-toggle-btn').onclick = (e) => { e.stopPropagation(); toggleChat(); };
            document.getElementById('chat-send-btn').onclick = (e) => { e.stopPropagation(); sendChatMessage(); };
            document.getElementById('chat-input').onkeydown = (e) => { if (e.key === 'Enter') sendChatMessage(); e.stopPropagation(); };
            
            document.getElementById('shop-btn').onclick = (e) => { e.stopPropagation(); toggleShop(); };
            document.getElementById('close-shop').onclick = () => toggleShop();
            document.getElementById('del-mode-btn').onclick = () => { deleteMode = !deleteMode; document.getElementById('del-mode-btn').innerText = `DELETE MODE: ${deleteMode?'ON':'OFF'}`; };
            
            document.getElementById('shop-mode-btn').onclick = () => { 
                shopSellMode = !shopSellMode; 
                const btn = document.getElementById('shop-mode-btn');
                btn.innerText = `MODE: ${shopSellMode ? 'SELL' : 'BUY'}`;
                btn.style.background = shopSellMode ? '#e74c3c' : '#2ecc71';
            };

            const pBtn = document.getElementById('pause-btn'), camBtn = document.getElementById('cam-btn'), fsBtn = document.getElementById('fs-btn'), pMenu = document.getElementById('pause-menu');
            camBtn.onclick = (e) => { e.stopPropagation(); povMode = (povMode + 1) % 3; updatePOV(); };
            fsBtn.onclick = (e) => { e.stopPropagation(); if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => fsBtn.innerText = "EXIT"); else document.exitFullscreen().then(() => fsBtn.innerText = "FULL"); };
            pBtn.onclick = (e) => { e.stopPropagation(); paused = true; pMenu.style.display = 'flex'; if(document.pointerLockElement) document.exitPointerLock(); };
            document.getElementById('resume-btn').onclick = () => { paused = false; pMenu.style.display = 'none'; if(!isTouch) document.body.requestPointerLock(); };
            document.getElementById('quit-btn').onclick = () => { saveGame(); location.reload(); };

            if(isTouch) {
                const zone = document.getElementById('joy-zone'), nub = document.getElementById('joy-nub');
                document.addEventListener('touchstart', e => {
                    if (!running || paused) return;
                    for(let t of e.changedTouches) {
                        const r = zone.getBoundingClientRect();
                        if (t.target.closest('#hotbar-container') || t.target.closest('.corner-btn') || t.target.closest('#inventory-overlay') || t.target.closest('#shop-overlay') || t.target.closest('#chat-container')) continue;
                        if(Math.hypot(t.clientX-(r.left+r.width/2), t.clientY-(r.top+r.height/2)) < 60) { joy.id = t.identifier; joy.sx = t.clientX; joy.sy = t.clientY; }
                        else if(t.target.closest('#jump-btn')) { handleJumpTap(); }
                        else if(t.target.closest('#up-btn')) { isTouchingUp = true; }
                        else if(t.target.closest('#down-btn')) { isTouchingDown = true; }
                        else if(touchState.id === null) {
                            touchState.id = t.identifier; touchState.lx = t.clientX; touchState.ly = t.clientY; touchState.sx = t.clientX; touchState.sy = t.clientY; 
                            touchState.startTime = Date.now(); touchState.moved = false;
                            touchState.timer = setTimeout(() => { 
                                if(!touchState.moved) { 
                                    document.getElementById('break-progress').style.transform = 'translate(-50%,-50%) scale(1)'; 
                                    touchState.timer = setInterval(() => interact(false), currentMineDelay); 
                                } 
                            }, 200);
                        }
                    }
                });
                document.addEventListener('touchmove', e => {
                    if(!running) return;
                    for(let t of e.changedTouches) {
                        if(t.identifier === joy.id) {
                            const dx = t.clientX - joy.sx, dy = t.clientY - joy.sy, d = Math.min(45, Math.hypot(dx,dy)), angle = Math.atan2(dy, dx);
                            joy.x = (Math.cos(angle) * d) / 45; joy.y = (Math.sin(angle) * d) / 45;
                            nub.style.transform = `translate(${Math.cos(angle)*d - 20}px,${Math.sin(angle)*d - 20}px)`;
                        } else if(t.identifier === touchState.id) {
                            if(Math.hypot(t.clientX - touchState.sx, t.clientY - touchState.sy) > MOVE_THRESHOLD) {
                                touchState.moved = true; 
                                if(touchState.timer) { clearTimeout(touchState.timer); clearInterval(touchState.timer); touchState.timer = null; }
                                document.getElementById('break-progress').style.transform = 'translate(-50%,-50%) scale(0)';
                            }
                            playerGroup.rotation.y -= (t.clientX - touchState.lx) * 0.008;
                            cameraPivot.rotation.x = Math.max(-1.5, Math.min(1.5, cameraPivot.rotation.x - (t.clientY - touchState.ly) * 0.008));
                            touchState.lx = t.clientX; touchState.ly = t.clientY;
                        }
                    }
                });
                document.addEventListener('touchend', e => {
                    if(!running) return;
                    for(let t of e.changedTouches) {
                        if(t.identifier === joy.id) { joy.id=null; joy.x=0; joy.y=0; nub.style.transform='translate(-50%,-50%)'; }
                        else if(t.target.closest('#up-btn')) { isTouchingUp = false; }
                        else if(t.target.closest('#down-btn')) { isTouchingDown = false; }
                        else if(t.identifier === touchState.id) { 
                            if(!touchState.moved && (Date.now() - touchState.startTime) < 300) interact(true); 
                            if(touchState.timer) { clearTimeout(touchState.timer); clearInterval(touchState.timer); touchState.timer = null; }
                            document.getElementById('break-progress').style.transform = 'translate(-50%,-50%) scale(0)';
                            touchState.id = null; 
                        }
                    }
                });
            } else {
                window.onkeydown = e => { 
                    if (!running || document.activeElement.tagName === 'INPUT') return; 
                    keys[e.key.toLowerCase()] = 1; 
                    if(e.key===' ') handleJumpTap(); 
                    if(e.key==='Escape') { paused = !paused; pMenu.style.display = paused ? 'flex' : 'none'; } 
                };
                window.onkeyup = e => { if(!running) return; keys[e.key.toLowerCase()] = 0; };
                window.onmousedown = e => { 
                    if(!running || paused || document.activeElement.tagName === 'INPUT') return; 
                    if(e.button === 0) { 
                        document.getElementById('break-progress').style.transform = 'translate(-50%,-50%) scale(1)'; 
                        if(touchState.timer) clearInterval(touchState.timer);
                        touchState.timer = setInterval(() => interact(false), currentMineDelay); 
                    } else if(e.button === 2) {
                        interact(true); 
                    }
                };
                window.onmouseup = e => { 
                    if(touchState.timer) { clearInterval(touchState.timer); touchState.timer = null; } 
                    document.getElementById('break-progress').style.transform = 'translate(-50%,-50%) scale(0)'; 
                };
                window.oncontextmenu = e => e.preventDefault();
                window.onmousemove = e => { 
                    if(!running) return; 
                    if(document.pointerLockElement) { 
                        playerGroup.rotation.y-=e.movementX*0.002; 
                        cameraPivot.rotation.x=Math.max(-1.5, Math.min(1.5, cameraPivot.rotation.x-e.movementY*0.002)); 
                    }
                };
            }
        }

        function updateHotbarFromInventory() {
            hotbarSlots = inventory.slice(0, 8);
        }

        function toggleInventory() {
            const overlay = document.getElementById('inventory-overlay');
            const isOpening = overlay.style.display !== 'flex';
            overlay.style.display = isOpening ? 'flex' : 'none';
            if(isOpening) {
                const grid = document.getElementById('inventory-grid'); grid.innerHTML = '';
                inventory.forEach((item, i) => {
                    const slot = document.createElement('div'); slot.className = 'slot' + (i < 8 ? ' active' : '');
                    if(item) {
                        const c = document.createElement('canvas'); c.width=32; c.height=32;
                        const t = BLOCKS[item.id].tiles[4]; const ctx = c.getContext('2d');
                        const tx = (t % ATLAS_COLS) * 32;
                        const ty = Math.floor(t / ATLAS_COLS) * 32;
                        ctx.drawImage(atlas.image, tx, ty, 32, 32, 0, 0, 32, 32);
                        slot.appendChild(c);
                        const cnt = document.createElement('div'); cnt.className = 'slot-count'; cnt.innerText = item.count;
                        slot.appendChild(cnt);
                        slot.onclick = () => {
                            if(deleteMode) { inventory[i] = null; updateHotbarFromInventory(); updateUI(); toggleInventory(); toggleInventory(); }
                        }
                    }
                    grid.appendChild(slot);
                });
                if(document.pointerLockElement) document.exitPointerLock();
            } else if(!isTouch && !paused) document.body.requestPointerLock();
        }

        function toggleShop() {
            const overlay = document.getElementById('shop-overlay');
            const isOpening = overlay.style.display !== 'flex';
            overlay.style.display = isOpening ? 'flex' : 'none';
            if(isOpening) switchShopTab('blocks');
            if(isOpening && document.pointerLockElement) document.exitPointerLock();
        }

        window.switchShopTab = (tab) => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            const grid = document.getElementById('shop-grid'); grid.innerHTML = '';
            
            if(tab === 'blocks') {
                Object.keys(BLOCKS).forEach(id => {
                    const b = BLOCKS[id]; if(!b.price && b.id !== 100) return;
                    createShopItem(grid, b.name, b.price, b, 'block', () => buyItem(id, b.price), (e) => { e.preventDefault(); sellItem(id, b.sellPrice || 0); });
                });
            } else if(tab === 'tools') {
                Object.keys(TOOLS).forEach(id => {
                    const t = TOOLS[id];
                    createShopItem(grid, t.name, t.price, t, 'tool', () => buyTool(id), (e) => e.preventDefault());
                });
            } else if(tab === 'skins') {
                Object.keys(SKINS).forEach(id => {
                    const s = SKINS[id];
                    const isOwned = ownedSkins.includes(id);
                    const label = isOwned ? "EQUIP" : s.price + '¢';
                    const color = isOwned ? '#2ecc71' : '#FFD700';
                    
                    createShopItem(grid, s.name, label, s, 'skin', () => buySkin(id), (e) => e.preventDefault(), color);
                });
            }
        };

        function createShopItem(grid, name, priceLabel, itemData, type, onClick, onRightClick, priceColor = '#FFD700') {
            const el = document.createElement('div'); el.className = 'shop-item';
            
            if(type === 'block' && itemData.tiles && atlas && atlas.image) {
                const c = document.createElement('canvas'); c.width = 32; c.height = 32;
                const t = itemData.tiles[4]; 
                const ctx = c.getContext('2d');
                const tx = (t % ATLAS_COLS) * 32;
                const ty = Math.floor(t / ATLAS_COLS) * 32;
                ctx.drawImage(atlas.image, tx, ty, 32, 32, 0, 0, 32, 32);
                el.appendChild(c);
            }

            const nameEl = document.createElement('div'); nameEl.className = 'shop-name'; nameEl.innerText = name; el.appendChild(nameEl);
            const priceEl = document.createElement('div'); priceEl.className = 'shop-price'; 
            priceEl.innerText = priceLabel; 
            priceEl.style.color = priceColor;
            el.appendChild(priceEl);
            
            el.onclick = (e) => {
                if (shopSellMode) onRightClick(e);
                else onClick(e);
            };
            el.oncontextmenu = onRightClick;
            grid.appendChild(el);
        }

        function buyItem(id, price) {
            if(coins >= price) {
                coins -= price;
                let added = false;
                for(let i=0; i<30; i++) { if(inventory[i] && inventory[i].id == id) { inventory[i].count++; added = true; break; } }
                if(!added) { for(let i=0; i<30; i++) { if(!inventory[i]) { inventory[i] = {id: parseInt(id), count: 1}; break; } } }
                updateCoinDisplay(); updateHotbarFromInventory(); updateUI(); saveGame();
            }
        }

        function sellItem(id, price) {
            if(price <= 0) return;
            const idx = inventory.findIndex(i => i && i.id == id);
            if(idx !== -1) {
                inventory[idx].count--;
                if(inventory[idx].count <= 0) inventory[idx] = null;
                coins += price;
                updateCoinDisplay(); updateHotbarFromInventory(); updateUI(); saveGame();
            }
        }

        function buyTool(id) {
            const t = TOOLS[id];
            if(coins >= t.price) {
                coins -= t.price;
                activeTool = t;
                currentMineDelay = 400 * t.speedMod;
                updateCoinDisplay(); saveGame();
                alert("Equipped " + t.name);
            }
        }

        function buySkin(id) {
            const s = SKINS[id];
            // Check if already owned
            if (ownedSkins.includes(id)) {
                equipSkin(id);
                return;
            }

            if(coins >= s.price) {
                coins -= s.price;
                ownedSkins.push(id);
                equipSkin(id);
                updateCoinDisplay(); 
                saveGame();
                // Refresh shop to show "EQUIP" button
                if (document.getElementById('shop-overlay').style.display === 'flex') {
                    switchShopTab('skins');
                }
            } else {
                alert("Not enough coins!");
            }
        }

        function equipSkin(id) {
            const s = SKINS[id];
            currentSkin = id;
            saveGame();
            
            // Switch the local player model immediately
            if (playerGroup && s.file) {
                // Remove current local model
                playerGroup.remove(externalModel);
                
                new THREE.GLTFLoader().load(s.file, (gltf) => {
                    externalModel = gltf.scene;
                    
                    // Fixed scaling logic here
                    if (s.scale) {
                        externalModel.scale.set(s.scale, s.scale, s.scale);
                    } else {
                        const bbox = new THREE.Box3().setFromObject(externalModel);
                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        const h = size.y;
                        const targetH = 2.0; 
                        if (h > 0) {
                            const scale = targetH / h;
                            externalModel.scale.set(scale, scale, scale);
                        } else {
                            externalModel.scale.set(0.4, 0.4, 0.4);
                        }
                    }
                    
                    externalModel.rotation.y = Math.PI; 
                    externalModel.position.y = -PLAYER_HEIGHT; // Fix height
                    externalModel.traverse(n => { 
                        if(n.isMesh) { 
                            n.castShadow = true; n.receiveShadow = true; 
                            if (s.color) {
                                if(n.material) n.material = n.material.clone();
                                if(n.material.color) n.material.color.setHex(s.color);
                            }
                        } 
                    }); 
                    playerGroup.add(externalModel);
                    
                    mixer = new THREE.AnimationMixer(externalModel); 
                    actions = {};
                    // Renaming animations for consistency
                    gltf.animations.forEach((clip) => { 
                        let n = clip.name;
                        if (n === 'Skeleton|Idle' || n === 'Idle') n = 'Idle';
                        else if (n === 'Skeleton|Walking' || n === 'Walking') n = 'Walking';
                        else if (n.toLowerCase().includes('idle')) n = 'Idle';
                        else if (n.toLowerCase().includes('walk') && !n.toLowerCase().includes('jump')) n = 'Walking';

                        actions[n] = mixer.clipAction(clip); 
                    });
                    if(actions['Idle']) { activeAction = actions['Idle']; activeAction.play(); }
                    updatePOV();
                }, undefined, (err) => {
                    console.error("Failed to load local skin: ", err);
                    alert("Failed to load model file. Check 'models' folder.");
                });
            }
            alert("Skin " + s.name + " Equipped!");
        }

        function updateCoinDisplay() { document.getElementById('coin-display').innerText = `COINS: ${coins}`; }

        function updateUI() {
            const slots = document.getElementById('hotbar-slots'); slots.innerHTML = '';
            hotbarSlots.forEach((item, i) => {
                const s = document.createElement('div'); s.className = 'slot' + (i === activeHotbarIndex ? ' active' : '');
                if(item && item.count > 0) { 
                    const c = document.createElement('canvas'); c.width=24; c.height=24;
                    const t = BLOCKS[item.id].tiles[4]; 
                    const ctx = c.getContext('2d'); 
                    const tx = (t % ATLAS_COLS) * 32;
                    const ty = Math.floor(t / ATLAS_COLS) * 32;
                    ctx.drawImage(atlas.image, tx, ty, 32, 32, 0, 0, 24, 24); 
                    s.appendChild(c); 
                    const cnt = document.createElement('div'); cnt.className = 'slot-count'; cnt.innerText = item.count; s.appendChild(cnt);
                }
                s.onclick = (e) => { e.stopPropagation(); activeHotbarIndex = i; updateUI(); 
                }; slots.appendChild(s);
            });
        }

        function updateWorld() {
            const px = Math.floor(playerGroup.position.x/CHUNK_SIZE), pz = Math.floor(playerGroup.position.z/CHUNK_SIZE);
            for(let x=px-RENDER_DIST; x<=px+RENDER_DIST; x++) {
                for(let x=px-RENDER_DIST; x<=px+RENDER_DIST; x++) {
                for(let z=pz-RENDER_DIST; z<=pz+RENDER_DIST; z++) {
                    const k = `${x},${z}`; if(!chunkMeshes[k]) { const m = buildChunk(x, z); if(m) { scene.add(m); clickables.push(m); chunkMeshes[k] = m; }}
                }
                }
            }
        }

        function animate() {
            if(!running) return;
            requestAnimationFrame(animate);
            if(paused || document.getElementById('inventory-overlay').style.display === 'flex' || document.getElementById('shop-overlay').style.display === 'flex' || document.getElementById('chat-container').style.display === 'flex') { renderer.render(scene, camera); return; }
            const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
            if(mixer) mixer.update(dt);
            if(isFlying) { let flyVel = 0; if (keys[' '] || isTouchingUp) flyVel += 1; if (keys['shift'] || isTouchingDown) flyVel -= 1; vel.y = flyVel * 10; } else { vel.y -= 24 * dt; }
            const r = playerGroup.rotation.y, speed = isFlying ? 12 : 5.5; 
            let mx=0, mz=0; if(isTouch) { mx=joy.x; mz=joy.y; } else { if(keys.w)mz=-1; if(keys.s)mz=1; if(keys.a)mx=-1; if(keys.d)mx=1; }
            const dx = (Math.sin(r)*mz + Math.cos(r)*mx) * speed, dz = (Math.cos(r)*mz - Math.sin(r)*mx) * speed;
            const ox = playerGroup.position.x; playerGroup.position.x += dx*dt; if(checkCol(playerGroup.position)) playerGroup.position.x = ox;
            const oz = playerGroup.position.z; playerGroup.position.z += dz*dt; if(checkCol(playerGroup.position)) playerGroup.position.z = oz;
            playerGroup.position.y += vel.y*dt;
            if(checkCol(playerGroup.position)) { if(vel.y < 0) { playerGroup.position.y = Math.ceil(playerGroup.position.y - PLAYER_HEIGHT) + PLAYER_HEIGHT; vel.y = 0; onGround = true; } else { playerGroup.position.y = Math.floor(playerGroup.position.y + 0.1) - 0.1; vel.y = 0; } } else onGround = false;
            
            // Animation Trigger
            if(mixer) { 
                const moving = Math.hypot(dx, dz) > 0.1;
                if(moving) fadeToAction('Walking', 0.2); 
                else fadeToAction('Idle', 0.2); 
            }
            
            if(externalModel) externalModel.position.y = -PLAYER_HEIGHT;
            gameTime += dt; const angle = ((gameTime % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS) * Math.PI * 2;
            
            sunLight.position.set(playerGroup.position.x + Math.sin(angle) * 60, playerGroup.position.y + Math.cos(angle) * 60, playerGroup.position.z + 20);
            sunLight.target.position.copy(playerGroup.position);
            
            const skyColor = Math.cos(angle) > 0 ? new THREE.Color(0x87CEEB) : new THREE.Color(0x0a0a1a);
            scene.background = skyColor; scene.fog.color = skyColor; stars.material.opacity = Math.cos(angle) < 0 ? 1 : 0;
            raycaster.setFromCamera({x:0, y:0}, camera); const hit = raycaster.intersectObjects(clickables)[0];
            if(hit) { const n = hit.face.normal; selectionBox.position.set(Math.floor(hit.point.x-n.x*0.1)+0.5, Math.floor(hit.point.y-n.y*0.1)+0.5, Math.floor(hit.point.z-n.z*0.1)+0.5); selectionBox.visible = true; } else selectionBox.visible = false;
            updateNetworkLoop(); updateRemotePlayersVisuals(dt); updateWorld(); renderer.render(scene, camera);
        }

        async function startGame(user) {
            currentUser = user;
            userId = user.uid;
            userDisplayName = user.displayName || user.email.split('@')[0] || userId.substr(0, 8);
            document.getElementById('user-display-id').innerText = userDisplayName;
            document.getElementById('loading').style.display = 'none';
            await loadGame();
            
            // Re-load correct skin for local player
            if(currentSkin && SKINS[currentSkin]) {
                 const s = SKINS[currentSkin];
                 new THREE.GLTFLoader().load(s.file, (gltf) => {
                    if (externalModel) playerGroup.remove(externalModel);
                    externalModel = gltf.scene;
                    
                    // Fixed scaling logic here
                    if (s.scale) {
                        externalModel.scale.set(s.scale, s.scale, s.scale);
                    } else {
                        const bbox = new THREE.Box3().setFromObject(externalModel);
                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        const h = size.y;
                        const targetH = 2.0; 
                        if (h > 0) {
                            const scale = (targetH / h);
                            externalModel.scale.set(scale, scale, scale);
                        } else {
                            externalModel.scale.set(0.4, 0.4, 0.4);
                        }
                    }
                    
                    externalModel.rotation.y = Math.PI; 
                    externalModel.position.y = -PLAYER_HEIGHT; 
                    externalModel.traverse(n => { 
                        if(n.isMesh) { 
                            n.castShadow = true; n.receiveShadow = true; 
                            if (s.color) {
                                if(n.material) n.material = n.material.clone();
                                if(n.material.color) n.material.color.setHex(s.color);
                            }
                        } 
                    }); 
                    playerGroup.add(externalModel);
                    mixer = new THREE.AnimationMixer(externalModel); 
                    actions = {};
                    
                    // Rename animations for consistency
                    gltf.animations.forEach((clip) => { 
                        let n = clip.name;
                        if (n === 'Skeleton|Idle' || n === 'Idle') n = 'Idle';
                        else if (n === 'Skeleton|Walking' || n === 'Walking') n = 'Walking';
                        else if (n.toLowerCase().includes('idle')) n = 'Idle';
                        else if (n.toLowerCase().includes('walk') && !n.toLowerCase().includes('jump')) n = 'Walking';

                        if (!actions[n]) actions[n] = mixer.clipAction(clip); 
                    });
                    
                    if(actions['Idle']) {
                        activeAction = actions['Idle'];
                        activeAction.play();
                    }
                    updatePOV();
                 }, undefined, (err) => {
                     console.error("Local player model load failed", err);
                 });
            }

            if(activeTool) currentMineDelay = 400 * activeTool.speedMod;

            initNetwork();
            playerGroup.position.set(0.5, 32, 0.5);
            for(let y=31; y>0; y--) if(getBlock(0,y,0) !== 0) { playerGroup.position.y = y+PLAYER_HEIGHT; break; }
            running = true;
            updatePOV();
            if(!isTouch) document.body.requestPointerLock();
            else document.querySelectorAll('.ctrl').forEach(e=>e.style.display='flex');
            updateWorld();
            animate();
        }

        async function init() {
            atlas = await createAtlas();
            scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x87CEEB, 15, 45);
            playerGroup = new THREE.Group(); scene.add(playerGroup);
            cameraPivot = new THREE.Group(); playerGroup.add(cameraPivot);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100); cameraPivot.add(camera);
            (function(){
            const devicePR = Math.min(window.devicePixelRatio || 1, 2);
            const mem = navigator.deviceMemory || 4;
            const preferAA = mem > 2 && devicePR <= 1.5;
            renderer = new THREE.WebGLRenderer({ antialias: preferAA, powerPreference: (mem > 4 ? 'high-performance' : 'low-power'), alpha: false, preserveDrawingBuffer: false });
            renderer.setPixelRatio(devicePR);
            renderer.setSize(window.innerWidth, window.innerHeight);
        })(); 
            renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
            document.body.appendChild(renderer.domElement);
            
            scene.add(ambientLight = new THREE.AmbientLight(0xffffff, 0.6)); 
            sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
            sunLight.castShadow = true; 
            sunLight.shadow.mapSize.width = (navigator.deviceMemory && navigator.deviceMemory < 4) ? 1024 : 2048; 
            sunLight.shadow.mapSize.height = (navigator.deviceMemory && navigator.deviceMemory < 4) ? 1024 : 2048; 
            const d = 50; 
            sunLight.shadow.camera.left = -d;
            sunLight.shadow.camera.right = d;
            sunLight.shadow.camera.top = d;
            sunLight.shadow.camera.bottom = -d;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 150;
            sunLight.shadow.bias = -0.0005;
            scene.add(sunLight);
            scene.add(sunLight.target); 

            raycaster = new THREE.Raycaster(); selectionBox = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), new THREE.MeshBasicMaterial({ color: 0, wireframe: true, transparent: true, opacity: 0.4 }));
            scene.add(selectionBox); 
            
            // Initial loader for the default robot
            new THREE.GLTFLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
                externalModel = gltf.scene; 
                // Don't normalize animations for the default robot here as they are already correct
                // And this is just the loading screen robot
                externalModel.animations = gltf.animations;
                
                // Fixed scaling for default robot
                const bbox = new THREE.Box3().setFromObject(externalModel);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const h = size.y;
                if (h > 0) {
                    const s = 2.0 / h; // Default robot 2 blocks tall
                    externalModel.scale.set(s, s, s);
                } else {
                    externalModel.scale.set(0.4, 0.4, 0.4);
                }

                externalModel.rotation.y = Math.PI; 
                externalModel.position.y = -PLAYER_HEIGHT; // Fix height
                externalModel.traverse(n => { if(n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); 
                playerGroup.add(externalModel);
                modelLoaded = true;

                mixer = new THREE.AnimationMixer(externalModel); 
                gltf.animations.forEach((clip) => { actions[clip.name] = mixer.clipAction(clip); });
                if(actions['Idle']) { activeAction = actions['Idle']; activeAction.play(); }
                
            }, undefined, () => {
                externalModel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), new THREE.MeshLambertMaterial({color: 0x00ff00})); 
                externalModel.castShadow = true; externalModel.receiveShadow = true;
                playerGroup.add(externalModel); 
            });
            
            document.getElementById('loading-text').innerText = 'CHECKING AUTH...';
            setPersistence(auth, browserLocalPersistence).then(() => {
                onAuthStateChanged(auth, (user) => {
                    if (user) startGame(user);
                    else { document.getElementById('loading-text').innerText = 'READY TO CONNECT'; document.getElementById('start-btn').style.display = 'block'; }
                });
            });

            clouds = new THREE.Mesh(new THREE.BoxGeometry(100, 2, 100), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); clouds.position.y = 45; scene.add(clouds);
            const starGeo = new THREE.BufferGeometry(), starPos = []; for(let i=0; i<1500; i++) starPos.push((Math.random()-0.5)*100, Math.random()*50+10, (Math.random()-0.5)*100);
            starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)); stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0 })); scene.add(stars); 
            setupInput(); updateUI();
            document.getElementById('start-btn').onclick = async () => {
                const provider = new GoogleAuthProvider();
                try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
            };
            window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
        }
        let last = performance.now(); init();