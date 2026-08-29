# FlockTrack - Active State

## Project
- **Name:** FlockTrack (JILGM-STBC Attendance System)
- **Repo:** github.com/morkmork26/JILGM-Attendance (public)
- **Live URL:** morkmork26.github.io/JILGM-Attendance/
- **Owner:** morkmork26 (GitHub), credentials in ~/.git-credentials

## Architecture
- **Frontend:** Single-file PWA (`index.html`, ~1970 lines vanilla JS/HTML/CSS)
- **Backend:** Google Apps Script (`gas/Code.gs`, ~1900 lines) deployed as Web App
- **Database:** Google Sheets (Sheet ID in Code.gs, deployed via PropertiesService)
- **Hosting:** GitHub Pages (free, HTTPS)
- **Offline:** Service Worker (cache-first) + IndexedDB for local data
- **Sync:** Fire-and-forget GET requests every 30s, server is authoritative

## Google Sheet Structure
| Sheet | Columns |
|-------|---------|
| Members | ID, Name, Outreach, DGroup, DGroupLeader, Ministry, Phone, Address, Birthday, Gender, CivilStatus, HasChildren, EmergencyContact, EmergencyPhone, Email, MembershipStatus, MembershipDate, BaptismDate, BaptismPlace, Classes, QRCodeURL, Status, DateRegistered (23 cols) |
| Attendance | MemberID, MemberName, Date, Timestamp, CheckedInBy, Occasion (6 cols) |
| Visitors | Name, Phone, Date, Notes |
| Config | Key, Value |
| Devices | DeviceID, Name, Status, RegisteredDate, Email |
| Reports | Date, Occasion, Outreach, Youth, YPro, Mothers, Fathers, Children, Total, New, Others, SentTo, Timestamp |
| Feedback | Date, Category, Message, UserEmail, Status |
| ApprovedUsers | Email, Name, Role, ApprovedDate, Status |

## Key Frontend State
- `allMembers[]` - full member list from IDB/server
- `todayAttendance[]` - today's check-ins
- `currentOccasion` - active occasion string (default "Sunday Service")
- `currentMode` - qr/tap/search
- `currentTab` - tabCheckin/tabMembers/tabReports/tabSettings
- Device ID in localStorage (`jilgm_deviceId`)
- Settings in IndexedDB `settings` store

## Key Backend Endpoints (all via GET ?data= or ?action=)
| Action | Type | What |
|--------|------|------|
| getMembers | read | All members |
| getAttendance&date= | read | Attendance for date |
| getSummary&month= | read | Monthly summary |
| checkIn | write | Record attendance |
| removeCheckIn | write | Remove attendance record |
| addMember | write | Create member (LockService protected) |
| updateMember | write | Edit member fields (single setValues) |
| deleteMember | write | Remove member row |
| addVisitor | write | Walk-in visitor |
| bulkSync | write | Batch offline check-ins |
| sendReport | write | Email report + XLSX backup |
| setOccasion | write | Change active occasion |
| registerDevice | write | Device access request |
| getDeviceStatus | read | Check device approval |
| updateDeviceStatus | write | Admin approve/block device |
| submitFeedback | write | User feedback |
| resendQR | write | Re-email QR code |

## Age Group Classification (current)
- Children: age <= 12
- Youth: age <= 21
- Mothers/Fathers: age 22+ AND (hasChildren=Yes OR married/widow/separated)
- YPro: age 22+ AND single without children
- Unknown: no birthday on file

## Check-In Modes
1. **QR Scan** - Camera scans member QR (contains member ID like MEM-042)
2. **Quick Tap** - Avatar grid, tap to check in. Filters: ministry, outreach, all/not-here
3. **Search** - Type name, results filtered by ministry, outreach, all/not-here

## Outreach Locations
Sto. Tomas (default/main), Tanauan, Naujan, Socorro

## Inactivity Rules
- Sto. Tomas: 8 consecutive Sundays absent = inactive
- Tanauan: 8 first-Sundays-of-month absent = inactive
- Naujan/Socorro: never auto-deactivated
- Requires 4+ unique attendance dates in local IDB before running

## Membership Graduation
First Time Guest -> (after 4 visits) -> Regular Attendee
Inactive member checked in -> status set to "active", membershipStatus to "Returning Guest"

## Sync Behavior
- autoSync every 30s: attendance (delete-replace + preserve pending), members (every 60s), occasion
- Manual "Sync Now": full refresh including pending queue replay
- Pending queue: failed server calls saved to IDB `pendingSync` store, replayed on Sync Now
- removedCheckins: persisted in localStorage with 5-min TTL to prevent sync re-insertion

## Scheduled Backend Tasks
- `weeklyBackup`: copies spreadsheet, emails admin
- `monthlyBackup`: copies to Backup folder in Drive
- `checkBirthdaysDaily`: emails birthday notifications to approved device users
- `onFormSubmit`: Google Form trigger, auto-registers members with QR

## Last Update
- **Date:** 2026-08-16
- **Version:** 1.4.1 (APP_VERSION in index.html)
- **SW Cache:** jilgm-v51
- **What:** 21 bug fixes from MLCR + 4 feature updates + birthday validation/warnings

## Frontend Function Index (index.html approximate line ranges)
| Range | Functions |
|-------|-----------|
| 587-650 | today(), localDateStr(), formatDate(), getAvatarColor(), getInitials(), getAge(), checkBirthdaysToday(), getAgeGroup(), createAvatar(), openDB(), dbGet/Put/Delete/Clear() |
| 650-740 | showToast(), openBottomSheet(), closeBottomSheet(), initCustomSelects(), customConfirm(), customPrompt(), playBeep(), spawnParticles(), playWarn() |
| 800-830 | getStreak() |
| 830-860 | switchTab(), switchMode(), swipe gesture handler |
| 880-930 | startEarlyCamera(), startQRScanner(), startQR(), cycleZoom(), flipCamera() |
| 930-985 | onQRScan(), checkInMember() |
| 987-1050 | loadTodayAttendance(), getMemberAttendCount(), isNewMember(), checkAndGraduate(), getFirstSundays(), checkInactiveMembers(), updateCounter() |
| 1054-1110 | renderAvatarGrid(), search input handler |
| 1112-1205 | showModal(), closeModal(), saveMember(), renderMemberList() |
| 1216-1270 | showDetail() (member detail panel with edit/delete/QR buttons) |
| 1271-1314 | renderReports() |
| 1316-1370 | getSetting(), setSetting(), getMinistries(), saveMinistries(), renderMinistryTags(), renderAdminCheckins(), removeCheckin() |
| 1367-1432 | loadSettings(), syncNowBtn, exportBtn handlers |
| 1440-1470 | addMinistryBtn, saveChildrenBtn, install prompt handlers |
| 1471-1600 | getDeviceId(), checkDeviceAccess(), loadPendingDevices(), renderPendingList(), approveDevice(), blockDevice(), showAccessGate() |
| 1600-1660 | init(), theme toggle |
| 1663-1702 | autoSync() (30s interval, preserves pending, throttled member refresh) |
| 1704-1766 | generateReportBtn handler (report modal with send) |
| 1768-1850 | APP_VERSION, CHANGELOG, renderChangelog(), checkWhatsNew() |
| 1850-1910 | Occasion management (get/save/setActive/render occasion tags) |
| 1910-1950 | Feedback, admin refresh, mode pill scroll hide |

## Version History (condensed)
| Version | Date | Key Changes |
|---------|------|-------------|
| 1.1.0 | 2026-07-27 | Google Sign-In, occasion selector, feedback, auto-sync 10s |
| 1.2.0 | 2026-07-28 | iOS POST fix (all GET), custom dropdowns, fixed layout |
| 1.3.0 | 2026-07-31 | Streaks, welcome-back, celebration animations, instant check-in |
| 1.4.0 | 2026-07-31 | Splash screen, zoom control, camera improvements |
| 1.4.1 | 2026-08-01 | Admin check-in list, swipe modes, splash animation |
| 1.4.1+patch | 2026-08-16 | 21 MLCR bug fixes + 4 feature updates (age groups, filters, delete) |
| 1.5.0 | 2026-08-17 | Camera picker, laptop scanning mode, collapsible header/nav, birthday validation, welcome gradient, mirror cam |
