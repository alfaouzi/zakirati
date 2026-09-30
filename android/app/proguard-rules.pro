# ProGuard rules for صدى حكايتي (My Memory Tells)
# Preserve data model serialization
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

-keepclassmembers class * {
    @org.jetbrains.kotlinx.serialization.Serializable <fields>;
}

# Preserve OkHttp internals
-dontwarn okhttp3.**
-dontwarn okio.**
