package com.star.agent

import android.util.Log
import com.facebook.react.bridge.*
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

class ShellModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ShellModule"

    private val workspaceDir: File by lazy {
        File(reactApplicationContext.filesDir, "sandbox").also { it.mkdirs() }
    }

    @ReactMethod
    fun exec(command: String, cwd: String?, timeout: Int, promise: Promise) {
        try {
            val processBuilder = ProcessBuilder("/system/bin/sh", "-c", command)
            processBuilder.directory(File(cwd ?: workspaceDir.absolutePath))
            processBuilder.redirectErrorStream(true)

            val process = processBuilder.start()
            val finished = process.waitFor(timeout.toLong(), java.util.concurrent.TimeUnit.SECONDS)

            if (!finished) {
                process.destroyForcibly()
                promise.reject("TIMEOUT", "Command timed out after ${timeout}s")
                return
            }

            val stdout = BufferedReader(InputStreamReader(process.inputStream)).use { it.readText() }
            val stderr = BufferedReader(InputStreamReader(process.errorStream)).use { it.readText() }

            val result = WritableNativeMap().apply {
                putString("stdout", stdout)
                putString("stderr", stderr)
                putInt("exitCode", process.exitValue())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e("ShellModule", "exec error", e)
            promise.reject("EXEC_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getWorkspacePath(promise: Promise) {
        promise.resolve(workspaceDir.absolutePath)
    }

    @ReactMethod
    fun initSandbox(promise: Promise) {
        try {
            val dirs = listOf("environments", "rootfs", "packages")
            dirs.forEach { dir ->
                File(workspaceDir, dir).mkdirs()
            }

            // Copy proot binary from assets if not exists or wrong size
            copyProotFromAssets()

            promise.resolve(workspaceDir.absolutePath)
        } catch (e: Exception) {
            Log.e("ShellModule", "initSandbox error", e)
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    private fun copyProotFromAssets() {
        val prootFile = File(workspaceDir, "proot")

        // Determine architecture
        val arch = when (android.os.Build.SUPPORTED_ABIS?.firstOrNull()) {
            "arm64-v8a" -> "aarch64"
            "x86_64" -> "x86_64"
            "armeabi-v7a" -> "arm"
            "x86" -> "i686"
            else -> "aarch64" // fallback
        }

        val assetName = "proot/proot-$arch"
        val assetManager = reactApplicationContext.assets

        try {
            assetManager.open(assetName).use { input ->
                prootFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            prootFile.setExecutable(true, false)
            Log.i("ShellModule", "Proot copied from assets: $assetName -> ${prootFile.absolutePath} (${prootFile.length()} bytes)")
        } catch (e: Exception) {
            Log.e("ShellModule", "Failed to copy proot from assets (asset=$assetName)", e)
            // Don't throw — let the caller handle missing proot
        }
    }
}
