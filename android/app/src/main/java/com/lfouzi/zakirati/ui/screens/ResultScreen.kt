package com.lfouzi.zakirati.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lfouzi.zakirati.domain.model.StoryAnalysisResult

@Composable
fun ResultScreen(
    result: StoryAnalysisResult,
    onSpeakMessage: () -> Unit,
    onPlayAgain: () -> Unit,
    onGoHome: () -> Unit
) {
    val isSufficient = result.overallScore > 0
    var showParentReport by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Child-friendly header
        Text(
            text = if (isSufficient) "أداء رائع لذاكرتك يا بطل! 🌟" else "نتيجة فحص التسجيل",
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center
        )

        if (result.isFallback) {
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    text = "تحليل محلي بديل (بدون اتصال بالإنترنت)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Big Prominent Score & Stars Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${result.overallScore}%",
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary
                )

                Text(
                    text = "مستوى التذكر الكلي",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(14.dp))

                val starCount = when {
                    result.overallScore >= 90 -> 5
                    result.overallScore >= 78 -> 4
                    result.overallScore >= 65 -> 3
                    result.overallScore >= 50 -> 2
                    else -> 1
                }

                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (i in 1..5) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (i <= starCount && isSufficient) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Positive Highlights for the Child
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = if (isSufficient) "أشياء رائعة تذكرتها! 👏" else "ملاحظات التسجيل",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black
                )

                Spacer(modifier = Modifier.height(10.dp))

                result.strengths.forEach { item ->
                    Row(
                        modifier = Modifier.padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(item, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Encouragement Voice Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "رسالة ذاكرتك",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "\"${result.encouragementMessage}\"",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onSpeakMessage,
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.VolumeUp, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("اسمع الرسالة", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Main Actions for the Child
        Button(
            onClick = onPlayAgain,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.Refresh, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("جولة جديدة 🎮", fontSize = 17.sp, fontWeight = FontWeight.Black)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onGoHome,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.Home, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("العودة للرئيسية", fontWeight = FontWeight.Bold)
        }

        // Parent / Educator Detailed Report (Collapsible Accordion)
        if (isSufficient) {
            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showParentReport = !showParentReport },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "تقرير تحليلي لولي الأمر والمعلم 👨‍👩‍👧",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = if (showParentReport) "اضغط للإغلاق" else "اضغط للاطلاع على التفاصيل الدلالية ومقارنة السرد",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Icon(
                            if (showParentReport) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = null
                        )
                    }

                    if (showParentReport) {
                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(16.dp))

                        // Sub-Scores
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            ScoreBadge("الأحداث الرئيسية", result.mainEventsScore)
                            ScoreBadge("ترتيب الأحداث", result.sequenceScore)
                            ScoreBadge("التفاصيل", result.detailsScore)
                        }

                        if (result.recalledDetails.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "ما تذكره الطفل بالأمثلة:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            result.recalledDetails.forEach {
                                Text("• $it", fontSize = 12.sp, modifier = Modifier.padding(vertical = 2.dp))
                            }
                        }

                        if (result.omittedDetails.isNotEmpty() || result.changedDetails.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "أوجه الاختلاف والتبديل في السرد:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            result.omittedDetails.forEach {
                                Text("• غاب عن السرد: $it", fontSize = 12.sp, modifier = Modifier.padding(vertical = 2.dp))
                            }
                            result.changedDetails.forEach {
                                Text("• أعاد صياغته: $it", fontSize = 12.sp, modifier = Modifier.padding(vertical = 2.dp))
                            }
                        }

                        if (result.charactersAnalysis.isNotBlank() || result.placesAnalysis.isNotBlank() || result.sequenceAnalysis.isNotBlank()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "تحليل عناصر القصة:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            if (result.charactersAnalysis.isNotBlank()) {
                                Text("• الشخصيات: ${result.charactersAnalysis}", fontSize = 12.sp)
                            }
                            if (result.placesAnalysis.isNotBlank()) {
                                Text("• الأماكن: ${result.placesAnalysis}", fontSize = 12.sp)
                            }
                            if (result.sequenceAnalysis.isNotBlank()) {
                                Text("• تسلسل الأحداث: ${result.sequenceAnalysis}", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScoreBadge(title: String, score: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        Text("$score%", fontSize = 15.sp, fontWeight = FontWeight.Black)
    }
}
