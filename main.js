const mineflayer = require('mineflayer')
const autoeat = require('mineflayer-auto-eat')
const AutoAuth = require('mineflayer-auto-auth')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear } = require('mineflayer-pathfinder').goals

const vec3 = require('vec3');
var cropType = 'wheat_seeds'
var seedName = 'wheat_seeds';
var harvestName = 'wheat';
var mcData;
var dig_harvest = 0;

const bot = mineflayer.createBot({
    host: 'mc.politbuild.ru', 
    version: "1.18.1",
    username: "sbuw4ik", //ник если пиратка, почта если лицензия
    //password: " pass", //если лицензия
	plugins: [AutoAuth],
	AutoAuth: {
		logging: true, 
		password: '19332a', // пароль от /reg /login
		ignoreRepeat: true,
	}
})

bot.on('serverAuth', function() {
        const p = bot.position
	bot.pathfinder.setGoal(new GoalNear(p.x, p.y + 16, p.z, 1)) 
  });

bot.on('chat', (username, message) => {
    if (username === bot.username) return
    if (message === "примите в иран") bot.chat(`/t add ${username}`)
	if (message === "start-farmer-bot") {
		dig_harvest = 1;
		cosmicLooper();
	}
	if (message === "stop-farmer-bot") dig_harvest = 0;
	if (message === "quit-farmer-bot") bot.quit();
    if (message === 'come') {
      const target = bot.players[username]?.entity
      if (!target) {
        bot.chat('I don\'t see you !')
        return
      }
      const p = target.position

      bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
  })

// Load the plugin
bot.loadPlugin(autoeat)
bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: []
  }
  mcData = require('minecraft-data')(bot.version);
  dig_harvest = 0;
})
// The bot eats food automatically and emits these events when it starts eating and stops eating.

bot.on('autoeat_started', () => {
  console.log('Auto Eat started!')
})

bot.on('autoeat_stopped', () => {
  console.log('Auto Eat stopped!')
})

bot.on('health', () => {
  if (bot.food === 20) bot.autoEat.disable()
  // Disable the plugin if the bot is at 20 food points
  else bot.autoEat.enable() // Else enable the plugin again
})


bot.on('kicked', console.log)
bot.on('error', console.log)
bot.on('end', console.log)

async function cosmicLooper() {
	if (dig_harvest != 1) return;

	if (bot.inventory.slots.filter(v=>v==null).length < 11) {
		await depositLoop();
	} else await farmLoop();

	setTimeout(cosmicLooper, 20);
}

async function depositLoop() {
	let chestBlock = bot.findBlock({
		matching: mcData.blocksByName['chest'].id,
	});

	if (!chestBlock) return;

	if (bot.entity.position.distanceTo(chestBlock.position) < 2) {
		bot.setControlState('forward', false);

		let chest = await bot.openChest(chestBlock);

		for (slot of bot.inventory.slots) {
			if (slot && slot.name == harvestName) {
				await chest.deposit(slot.type, null, slot.count);
			}
			if (slot && slot.name == seedName) {
				await chest.deposit(slot.type, null, slot.count);
			}
		}
		chest.close();
	} else {
		bot.lookAt(chestBlock.position);
		bot.setControlState('forward', true);
	}
}

async function farmLoop() {
	let harvest = readyCrop();

	if (harvest) {
		bot.lookAt(harvest.position);
		try {
			if (bot.entity.position.distanceTo(harvest.position) < 2) {
				bot.setControlState('forward', false);

				await bot.dig(harvest);
				if (!bot.heldItem || bot.heldItem.name != seedName) await bot.equip(mcData.itemsByName[seedName].id);

				let dirt = bot.blockAt(harvest.position.offset(0, -1, 0));
				await bot.placeBlock(dirt, vec3(0, 1, 0));
			} else {
				bot.setControlState('forward', true);
			}
		} catch(err) {
			console.log(err);
		}
	}
}

function readyCrop() {
	return bot.findBlock({
        maxDistance: 10,
		matching: (blk)=>{
			return(blk.name == harvestName && blk.metadata == 7);
		}
	});
}
