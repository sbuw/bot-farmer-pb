const mineflayer = require('mineflayer')
const autoeat = require('mineflayer-auto-eat')
const AutoAuth = require('mineflayer-auto-auth')
const { pathfinder, Movements, goals: { GoalNear}} = require('mineflayer-pathfinder')
const inventoryViewer = require('mineflayer-web-inventory')
const vec3 = require('vec3');
var seedName = 'wheat_seeds';
var harvestName = 'wheat';
var mcData;
var dig_harvest = 0;

const bot = mineflayer.createBot({
    host: 'mc.politbuild.ru', 
	//port: 3457,
	version: "1.18.1", //версия на которой работает бот ( 1.16.5 - 1.18  для полита)
    username: "cumpotbt", //ник если пиратка, почта если лицензия
    //password: "password", //если лицензия
	//auth: 'mojang', // если лог через mojang можно и через microsoft
	plugins: [AutoAuth],
	AutoAuth: {
		logging: true, 
		password: 'password', // пароль от /reg /login
		ignoreRepeat: true,
	}
})

//inventoryViewer(bot) // чтоб видеть инвентарь бота ( http://localhost:3000/ )

// Load the plugin
bot.loadPlugin(autoeat)
bot.loadPlugin(pathfinder)

bot.on('serverAuth', function() {
	var date = new Date();
    console.log(`Im [${bot.username}] logging! | ${date.getDate()}.${date.getMonth()}.${date.getUTCFullYear()} - ${date.getHours()}:${date.getMinutes()}`)
	const target = bot.entity
	const { x: botX, y: botY, z: botZ} = target.position
	bot.pathfinder.setGoal(new GoalNear(botX - 17, botY, botZ, 0)) 
})

bot.on('login', () => {
	bot.autoEat.options = {
		priority: 'foodPoints',
    	startAt: 14,
    	bannedFood: []
  	}
	const mcData = require('minecraft-data')(bot.version);
  	const defaultMove = new Movements(bot, mcData);
	bot.pathfinder.setMovements(defaultMove)
	defaultMove.scafoldingBlocks = [59]
	defaultMove.allowFreeMotion = true

})

bot.once('spawn', () => {
	//bot.pathfinder.stop()
	dig_harvest = 0;
	//cosmicLooper();
})

bot.on('whisper', function(username, message) {
	if (username === bot.username) return
	if (message === "startbt") {
		bot.pathfinder.stop()
		dig_harvest = 1;
		cosmicLooper();
	}
	if (message === "stopbt") {
		bot.pathfinder.stop()
		dig_harvest = 0;
	}
	if (message === "quitbt") bot.quit();
	if (message === 'comebt') {
		bot.pathfinder.stop()
		const target = bot.players[username]?.entity
		if (!target) {
			return
		  }
		const { x: playerX, y: playerY, z: playerZ} = target.position
		bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, 0))
	}
	if (message === "testbt") {
		bot.chat("/reply what?")
	}
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
	const mcData = require('minecraft-data')(bot.version);
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

		await withdrawItem("wheat_seeds", 32)

		chest.close()
		
	} else {
		bot.lookAt(chestBlock.position);
		bot.setControlState('forward', true);
	}

	function itemByName (items, name) {
		let item
		let i
		for (i = 0; i < items.length; ++i) {
		  item = items[i]
		  if (item && item.name === name) return item
		}
		return null
	  }

	async function withdrawItem (name, amount) {
		const chest = await bot.openChest(chestBlock)
		const item = itemByName(chest.containerItems(), name)
		if (item) {
		  try {
			await chest.withdraw(item.type, null, amount)
			console.log(`withdrew ${amount} ${item.name}`)
			await bot.equip(mcData.itemsByName[seedName].id)
		  } catch (err) {
			console.log(`unable to withdraw ${amount} ${item.name}`)
		  }
		} else {
		  console.log(`unknown item ${name}`)
		}
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