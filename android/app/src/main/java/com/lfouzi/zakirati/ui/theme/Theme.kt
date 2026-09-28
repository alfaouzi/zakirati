package com.lfouzi.zakirati.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val AmberPrimary = Color(0xFFD97706)
val AmberSecondary = Color(0xFFF59E0B)
val AmberBackground = Color(0xFFFFFBEB)
val SurfaceColor = Color(0xFFFFFFFF)
val TextDark = Color(0xFF451A03)

private val LightColorScheme = lightColorScheme(
    primary = AmberPrimary,
    secondary = AmberSecondary,
    background = AmberBackground,
    surface = SurfaceColor,
    onPrimary = Color.White,
    onSecondary = TextDark,
    onBackground = TextDark,
    onSurface = TextDark
)

@Composable
fun ZakiratiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
