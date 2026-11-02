import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { statfs } from "node:fs/promises";

const execAsync = promisify(exec);

function getCPUUsage() {
    const cpus = os.cpus();
    return cpus.map((cpu) => {
        const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
        const usage = 100 - (100 * cpu.times.idle) / total;
        return usage.toFixed(1);
    });
}

async function getCPUTemp() {
    const { stdout } = await execAsync("vcgencmd measure_temp");
    return parseFloat(stdout.replace("temp=", "").replace("'C", ""));
}

function bytesToGB(bytes: number) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2); 
}

export async function getSystemDetails() {
    const cpuUsage = getCPUUsage();

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuTemp = await getCPUTemp();

    const storage = await statfs("/");

    const totalStorage = 
        storage.blocks * storage.bsize;

    const freeStorage = 
        storage.bavail * storage.bsize;

    const usedStorage =
        totalStorage - freeStorage;

    return {
        os, 
        cpuTemp,
        cpuUsage,
        memoryUsage: {
            total: parseFloat(bytesToGB(totalMem)),
            used: parseFloat(bytesToGB(usedMem)),
            free: parseFloat(bytesToGB(freeMem))
        },

        storageUsage: {
            total: parseFloat(bytesToGB(totalStorage)),
            used: parseFloat(bytesToGB(usedStorage)),
            free: parseFloat(bytesToGB(freeStorage)),
        },
    };
}
