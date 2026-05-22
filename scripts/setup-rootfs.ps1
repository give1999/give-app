# Скрипт для создания локального rootfs в assets/rootfs/
# Запустить: .\scripts\setup-rootfs.ps1

$project = "C:\Users\shilo2\Desktop\Give\my-agent-app"
$rootfs = "$project\assets\rootfs"

Write-Host "=== Setting up local rootfs ===" -ForegroundColor Cyan

# 1. Создаём директории
$dirs = @('bin','sbin','usr/bin','usr/sbin','etc','tmp','var','var/run','var/log','home','root','lib','lib64','usr/lib','usr/lib64','usr/local','usr/local/bin','usr/local/sbin','mnt','opt','run','srv','media','proc','sys','dev')
foreach ($d in $dirs) {
    $fullPath = Join-Path $rootfs $d
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Force -Path $fullPath | Out-Null
    }
}
Write-Host "Directories created" -ForegroundColor Green

# 2. Скачиваем busybox
$bbUrl = "https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox"
$bbPath = "$rootfs\bin\busybox"

if (!(Test-Path $bbPath)) {
    Write-Host "Downloading busybox..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $bbUrl -OutFile $bbPath -UseBasicParsing
        Write-Host "Busybox downloaded: $((Get-Item $bbPath).Length) bytes" -ForegroundColor Green
    } catch {
        Write-Error "Failed to download busybox: $_"
        exit 1
    }
} else {
    Write-Host "Busybox already exists: $((Get-Item $bbPath).Length) bytes" -ForegroundColor Green
}

# 3. Копируем busybox под всеми именами (busybox = мультикалл)
$tools = @(
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
    'fuser','lsof','pmap','pwdx','killall','pkill','pgrep','pidof',
    'chrt','setsid','setpriv','run-parts','pipe_progress','mkfifo','mknod','mktemp',
    'realpath','dirname','basename','pathchk','printenv','getopt','hd','xxd',
    'strings','cmp','comm','patch','ed','gawk','nawk','egrep','fgrep','zgrep',
    'zegrep','zfgrep','bzip2','bunzip2','bzcat','unlzma','lzma','lzcat','unxz',
    'xz','xzcat','unzip','zip','rpm','rpm2cpio','dpkg','dpkg-deb','install',
    'hold','deallocvt','openvt','chvt','setfont','loadfont','kbd_mode','dumpkmap',
    'loadkmap','setkeycodes','setlogcons','fbset','fbsplash','cal','catv','chat',
    'chpasswd','chpst','cksum','cpio','crond','crontab','cryptpw',
    'dhcprelay','dnsd','dnsdomainname','dos2unix','dumpleases',
    'envdir','envuidgid','ether-wake','expand','factor','fakeidentd','false',
    'fdflush','fdformat','fdisk','fgconsole','findfs','flash_eraseall','flash_lock',
    'flash_unlock','flashcp','flock','fold','freeramdisk','fsck','fsck.minix',
    'fsync','ftpget','ftpput','hdparm','hush','hwclock','ifconfig',
    'ifdown','ifenslave','ifup','inetd','insmod','ip','ipaddr','ipcalc','ipcrm',
    'ipcs','iplink','ipneigh','iproute','iprule','iptunnel','killall5','klogd',
    'length','less','linux32','linux64','linuxrc','loadfont','loadkmap','logname',
    'losetup','lpd','lpq','lpr','lsattr','lsmod','lspci','lsusb','lzcat','lzma',
    'makedevs','makemime','man','mdev','microcom','mesg','mkdosfs','mke2fs',
    'mkfs.ext2','mkfs.ext3','mkfs.ext4','mkfs.minix','mkfs.reiser','mkfs.vfat',
    'mknod','mkpasswd','mkswap','modinfo','modprobe','more','mountpoint',
    'mt','nc','netstat','nmeter','ntpd','passwd','pgrep','pidof','pipe_progress',
    'pivot_root','pkill','popmaildir','pscan','raidautorun','rdate','rdev',
    'readahead','readprofile','restorecon','rmmod','rpm','rpm2cpio','runlevel',
    'runsv','runsvdir','rx','script','scriptreplay','sendmail','setarch',
    'setconsole','setfont','setkeycodes','setserial','setuidgid','sha1sum',
    'sha512sum','showkey','shuf','slattach','softlimit','split','start-stop-daemon',
    'sv','svlogd','swapoff','swapon','switch_root','sync','sysctl','syslogd',
    'tac','taskset','tc','tftp','tftpd','tftp','traceroute6','truncate','ts',
    'ttysize','ubiattach','ubidetach','ubimkvol','ubirmvol','ubirsvol','ubiupdatevol',
    'udhcpc6','umount','uncompress','unexpand','unix2dos','unlzop','usleep',
    'uudecode','uuencode','vlock','volname','watchdog','zcat','zcip','zcmp',
    'zdiff','ztest'
)

Write-Host "Installing $($tools.Count) busybox tools..." -ForegroundColor Yellow
$installed = 0
foreach ($t in $tools) {
    $dest = "$rootfs\bin\$t"
    if (!(Test-Path $dest)) {
        Copy-Item $bbPath $dest -Force
    }
    $installed++
    if ($installed % 50 -eq 0) {
        Write-Host "  Progress: $installed / $($tools.Count)" -ForegroundColor Gray
    }
}
Write-Host "Installed $installed tools" -ForegroundColor Green

# 4. Создаём базовые конфиги
Set-Content -Path "$rootfs\etc\passwd" -Value "root:x:0:0:root:/root:/bin/sh`n" -NoNewline -Encoding UTF8
Set-Content -Path "$rootfs\etc\group" -Value "root:x:0:`n" -NoNewline -Encoding UTF8
Set-Content -Path "$rootfs\etc\hosts" -Value "127.0.0.1`tlocalhost`n" -NoNewline -Encoding UTF8
Set-Content -Path "$rootfs\etc\resolv.conf" -Value "nameserver 8.8.8.8`nnameserver 8.8.4.4`n" -NoNewline -Encoding UTF8
Set-Content -Path "$rootfs\etc\profile" -Value "export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin`nexport HOME=/root`nexport TMPDIR=/tmp`n" -NoNewline -Encoding UTF8
Write-Host "Config files created" -ForegroundColor Green

# 5. Статистика
$fileCount = (Get-ChildItem $rootfs -Recurse -File | Measure-Object).Count
$dirCount = (Get-ChildItem $rootfs -Recurse -Directory | Measure-Object).Count
$totalSize = (Get-ChildItem $rootfs -Recurse -File | Measure-Object -Property Length -Sum).Sum

Write-Host "`n=== Rootfs setup complete ===" -ForegroundColor Cyan
Write-Host "Location: $rootfs" -ForegroundColor White
Write-Host "Files: $fileCount" -ForegroundColor White
Write-Host "Directories: $dirCount" -ForegroundColor White
Write-Host "Total size: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host "`nNow rebuild the APK: npx expo run:android" -ForegroundColor Yellow
