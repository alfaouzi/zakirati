package com.lfouzi.zakirati.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.ui.viewmodel.GameUiState

@Composable
fun RoundOneScreen(
    state: GameUiState,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onConfirm: () -> Unit
) {
    val context = LocalContext.current
    var permissionDeniedMessage by remember { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            permissionDeniedMessage = null
            onStartRecording()
        } else {
            permissionDeniedMessage = "يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك."
        }
    }

    val handleMicClick = {
        val permissionCheck = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        )
        if (permissionCheck == PackageManager.PERMISSION_GRANTED) {
            permissionDeniedMessage = null
            onStartRecording()
        } else {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Text(
                    text = "الجولة الأولى",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "احكِ قصتك",
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "احكِ عن موقف أو قصة حدثت معك.",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }

        // Center Mic Action
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val isRecording = state.gameState == GameState.ROUND_ONE_RECORDING
            val isRecorded = state.gameState == GameState.ROUND_ONE_RECORDED

            if (isRecording) {
                Text(
                    text = "جارٍ التسجيل...",
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onStopRecording,
                    modifier = Modifier.size(100.dp),
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = "إيقاف التسجيل", modifier = Modifier.size(48.dp))
                }
            } else {
                Button(
                    onClick = handleMicClick,
                    modifier = Modifier.size(100.dp),
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Mic, contentDescription = "ابدأ التسجيل", modifier = Modifier.size(48.dp))
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = if (isRecorded) "تم تسجيل القصة." else "ابدأ التسجيل",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            val displayedError = permissionDeniedMessage ?: state.errorMessage
            displayedError?.let { error ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Bottom Continue Button
        if (state.gameState == GameState.ROUND_ONE_RECORDED) {
            Button(
                onClick = onConfirm,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("متابعة", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            Spacer(modifier = Modifier.height(56.dp))
        }
    }
}
