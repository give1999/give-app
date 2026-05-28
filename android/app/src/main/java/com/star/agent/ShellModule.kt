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

            promise.resolve(workspaceDir.absolutePath)
        } catch (e: Exception) {
            Log.e("ShellModule", "initSandbox error", e)
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getNativeLibraryDir(promise: Promise) {
        try {
            promise.resolve(reactApplicationContext.applicationInfo.nativeLibraryDir)
        } catch (e: Exception) {
            promise.reject("LIBRARY_DIR_ERROR", e.message, e)
        }
    }
}
