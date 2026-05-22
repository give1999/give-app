import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { execShell, getWorkspacePath } from './nativeShell';

const BUSYBOX_TOOLS = [
  'sh','ash','bash','ls','cat','cp','mv','rm','mkdir','rmdir','chmod','chown',
  'grep','find','sed','awk','tar','gzip','gunzip','wget','ping','ps','top',
  'kill','echo','printf','test','tee','xargs','which','readlink','ln','touch',
  'stat','vi','diff','base64','md5sum','sha256sum','env','sleep','date','dd',
  'df','du','head','tail','wc','whoami','id','hostname','uname','mount','umount',
  'chroot','su','login','init','reboot','halt','poweroff','clear','reset','stty',
  'tty','dmesg','free','uptime','watch','seq','expr','bc','hexdump','od','tr',
  'rev','sort','uniq','cut','paste','join','nl','nohup','nice','renice','ionice',
  'taskset','logger','who','w','last','mesg','wall','time','timeout','nc',
  'nslookup','host','arp','ifconfig','ip','route','netstat','traceroute','ping6',
  'ftpget','ftpput','tftp','telnet','ftpd','telnetd','httpd','udhcpc','udhcpd',
  'dnsd','inetd','tftpd','brctl','vconfig','tunctl','zcip','nameif','iptunnel',
  'fuser','lsof','pmap','pwdx','killall','pkill','pgrep','pidof','ionice',
  'chrt','setsid','setpriv','run-parts','pipe_progress','mkfifo','mknod','mktemp',
  'realpath','dirname','basename','pathchk','printenv','getopt','hd','xxd',
  'strings','cmp','comm','patch','ed','gawk','nawk','egrep','fgrep','zgrep',
  'zegrep','zfgrep','bzip2','bunzip2','bzcat','unlzma','lzma','lzcat','unxz',
  'xz','xzcat','unzip','zip','rpm','rpm2cpio','dpkg','dpkg-deb','install',
  'hold','deallocvt','openvt','chvt','setfont','loadfont','kbd_mode','dumpkmap',
  'loadkmap','setkeycodes','setlogcons','fbset','fbsplash','cal','catv','chat',
  'chpasswd','chpst','chrt','cksum','clear','cpio','crond','crontab','cryptpw',
  'dhcprelay','dnsd','dnsdomainname','dos2unix','dpkg','dpkg-deb','dumpleases',
  'envdir','envuidgid','ether-wake','expand','factor','fakeidentd','false',
  'fdflush','fdformat','fdisk','fgconsole','findfs','flash_eraseall','flash_lock',
  'flash_unlock','flashcp','flock','fold','freeramdisk','fsck','fsck.minix',
  'fsync','ftpget','ftpput','gunzip','gzip','hdparm','hush','hwclock','ifconfig',
  'ifdown','ifenslave','ifup','inetd','insmod','ip','ipaddr','ipcalc','ipcrm',
  'ipcs','iplink','ipneigh','iproute','iprule','iptunnel','killall5','klogd',
  'length','less','linux32','linux64','linuxrc','loadfont','loadkmap','logname',
  'losetup','lpd','lpq','lpr','lsattr','lsmod','lspci','lsusb','lzcat','lzma',
  'makedevs','makemime','man','mdev','microcom','mesg','mkdosfs','mke2fs',
  'mkfs.ext2','mkfs.ext3','mkfs.ext4','mkfs.minix','mkfs.reiser','mkfs.vfat',
  'mknod','mkpasswd','mkswap','modinfo','modprobe','more','mount','mountpoint',
  'mt','nc','netstat','nmeter','ntpd','passwd','pgrep','pidof','pipe_progress',
  'pivot_root','pkill','popmaildir','pscan','raidautorun','rdate','rdev',
  'readahead','readprofile','restorecon','rmmod','rpm','rpm2cpio','runlevel',
  'runsv','runsvdir','rx','script','scriptreplay','sendmail','setarch',
  'setconsole','setfont','setkeycodes','setlogcons','setserial','setsid',
  'setuidgid','sha1sum','sha512sum','showkey','shuf','slattach','sleep',
  'softlimit','split','start-stop-daemon','strings','stty','sulogin','sum',
  'sv','svlogd','swapoff','swapon','switch_root','sync','sysctl','syslogd',
  'tac','tail','tar','taskset','tc','telnet','telnetd','tftp','tftpd','top',
  'touch','tr','traceroute','traceroute6','true','truncate','ts','tty',
  'ttysize','tunctl','ubiattach','ubidetach','ubimkvol','ubirmvol','ubirsvol',
  'ubiupdatevol','udhcpc','udhcpc6','udhcpd','umount','uname','uncompress',
  'unexpand','uniq','unix2dos','unlzma','unlzop','unxz','unzip','uptime',
  'usleep','uudecode','uuencode','vconfig','vlock','volname','wall','watch',
  'watchdog','wc','wget','which','who','whoami','whois','xargs','xz','xzcat',
  'yes','zcat','zcip','zcmp','zdiff','zgrep','zip','ztest'
];

function getRootfsDir(): string {
  return `${FileSystem.documentDirectory}sandbox/rootfs/`;
}

/**
 * Улучшенная проверка установленной rootfs.
 * Защищает от ложных срабатываний при наличии битых или системных симлинков.
 * Реальный бинарник busybox весит ~1.1 МБ, симлинк — ~12 байт.
 */
export async function isRootfsInstalled(): Promise<boolean> {
  try {
    const shPath = getRootfsDir() + 'bin/sh';
    const info = await FileSystem.getInfoAsync(shPath);
    return info.exists && !info.isDirectory && (info.size || 0) > 100_000;
  } catch {
    return false;
  }
}

/**
 * Архитектурно корректная установка изолированной среды.
 *
 * Принципы:
 * - Бинарный файл busybox записывается ровно один раз.
 * - Все утилиты создаются как относительные симлинки через нативный шелл.
 * - Идемпотентная очистка старых артефактов перед установкой.
 */
export async function installRootfs(onProgress?: (percent: number) => void): Promise<void> {
  const rootfsDir = getRootfsDir();

  // 1. Идемпотентная очистка старых артефактов
  console.log('[rootfs] Performing strict cleanup of old rootfs...');
  const rootfsInfo = await FileSystem.getInfoAsync(rootfsDir);
  if (rootfsInfo.exists) {
    await FileSystem.deleteAsync(rootfsDir, { idempotent: true });
  }
  onProgress?.(0.1);

  // 2. Создание минимально необходимой структуры папок
  console.log('[rootfs] Creating clean directory structure...');
  const dirs = ['bin', 'sbin', 'usr/bin', 'usr/sbin', 'etc', 'tmp', 'var', 'var/run', 'var/log', 'home', 'root', 'proc', 'sys', 'dev'];
  for (const dir of dirs) {
    await FileSystem.makeDirectoryAsync(rootfsDir + dir, { intermediates: true });
  }
  onProgress?.(0.2);

  // 3. Загрузка и копирование ЕДИНСТВЕННОГО экземпляра busybox
  console.log('[rootfs] Deploying core busybox binary...');
  const busyboxAsset = Asset.fromModule(require('../../../assets/busybox/busybox.bin'));
  await busyboxAsset.downloadAsync();
  const busyboxUri = busyboxAsset.localUri || busyboxAsset.uri;
  if (!busyboxUri) throw new Error('Failed to resolve busybox asset uri');

  const bbBase64 = await FileSystem.readAsStringAsync(busyboxUri, { encoding: FileSystem.EncodingType.Base64 });
  const destBusyboxPath = rootfsDir + 'bin/busybox';

  // Пишем один раз
  await FileSystem.writeAsStringAsync(destBusyboxPath, bbBase64, { encoding: FileSystem.EncodingType.Base64 });
  onProgress?.(0.5);

  // 4. Нативная инициализация симлинков (Разворачивание среды)
  console.log('[rootfs] Configuring permissions and creating relative symlinks...');

  // Получаем реальный путь файловой системы (не file:// URI) для нативных команд
  const workspacePath = await getWorkspacePath();
  const nativeBinPath = `${workspacePath}/rootfs/bin`;

  // Делаем busybox исполняемым
  await execShell(`chmod 755 ${nativeBinPath}/busybox`);

  // Оптимизированный пакетный запуск создания относительных симлинков в одной шелл-сессии
  const toolsChunks: string[][] = [];
  const chunkSize = 50; // Разбиваем на чанки, чтобы строка команды не была слишком длинной
  for (let i = 0; i < BUSYBOX_TOOLS.length; i += chunkSize) {
    toolsChunks.push(BUSYBOX_TOOLS.slice(i, i + chunkSize));
  }

  for (let i = 0; i < toolsChunks.length; i++) {
    const chunk = toolsChunks[i];
    const lnCommands = chunk.map(tool => `ln -sf busybox ${tool}`).join(' && ');
    await execShell(`cd ${nativeBinPath} && ${lnCommands}`);

    onProgress?.(0.5 + (i / toolsChunks.length) * 0.4);
  }

  // 5. Создание базовых конфигурационных файлов окружения
  console.log('[rootfs] Writing system environment configs...');
  await FileSystem.writeAsStringAsync(rootfsDir + 'etc/passwd', 'root:x:0:0:root:/root:/bin/sh\n', { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(rootfsDir + 'etc/group', 'root:x:0:\n', { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(rootfsDir + 'etc/hosts', '127.0.0.1\tlocalhost\n', { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(rootfsDir + 'etc/resolv.conf', 'nameserver 8.8.8.8\nnameserver 8.8.4.4\n', { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(rootfsDir + 'etc/profile', 'export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin\nexport HOME=/root\nexport TMPDIR=/tmp\n', { encoding: FileSystem.EncodingType.UTF8 });

  // Финальная верификация работоспособности созданного бинарника
  const shInfo = await FileSystem.getInfoAsync(rootfsDir + 'bin/sh');
  if (!shInfo.exists) {
    throw new Error('Verification failed: bin/sh symlink was not created properly');
  }

  onProgress?.(1.0);
  console.log('[rootfs] Sandbox Rootfs fully deployed and optimized.');
}

export async function getRootfsPath(): Promise<string> {
  return getRootfsDir();
}
