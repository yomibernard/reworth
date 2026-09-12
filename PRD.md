# ReWorth — Product Requirements Document

| Field | Value |
| --- | --- |
| Product Type | Consumer Recommerce Marketplace |
| Initial Market | Lagos, Nigeria |
| Initial Geographic Focus | Lekki, Ikoyi, Victoria Island, Oniru, VGC, Chevron, Ajah and surrounding communities |
| Platforms | iOS, Android, Responsive Web and Administration Portal |
| Document Version | 1.0 |
| Product Stage | MVP to Market Launch |

## 1. PRODUCT VISION

ReWorth will be a trusted digital marketplace that allows individuals to quickly sell, buy, swap or give away items they already own.

The platform will transform informal resale activity currently taking place through WhatsApp groups, estate groups, personal contacts and social media into a structured, trusted and convenient marketplace.

The experience should allow a person to photograph an item and publish it for sale within approximately 60 seconds.

The long-term ambition is to create Nigeria's leading recommerce ecosystem.

The platform should become the first place people think of before throwing something away, storing something they no longer need or purchasing the same item new.

## 2. PRODUCT PURPOSE

People own significant quantities of useful assets that are underutilised.

These include:

Furniture
Electronics
Cars
Phones
Home appliances
Fashion
Children's items
Sports equipment
Office equipment
Luxury items
Generators
Home accessories
Tools
Collectibles

Many owners want to dispose of these assets but do not have a convenient, trusted and organised method of finding buyers.

Current alternatives typically involve:

WhatsApp status
WhatsApp groups
Instagram
Personal networks
Estate groups
Classified websites
Informal brokers

These methods create problems around discovery, trust, valuation, payments, fraud, logistics and transaction completion.

ReWorth will provide the digital infrastructure connecting these parties.

## 3. CORE CUSTOMER PROMISE

#### For sellers

Turn things you no longer need into money quickly.

#### For buyers

Discover useful items around you at attractive prices.

#### For both parties

Trade with greater confidence.

## 4. PRODUCT PRINCIPLES

The product must be built around seven principles.

### 4.1 Simplicity

A first-time user should understand the application without instructions.

### 4.2 Trust

Identity, listings, payments and transactions must incorporate visible trust signals.

### 4.3 Local First

Users should primarily discover items located close to them.

### 4.4 Visual First

Photographs should drive discovery rather than large amounts of text.

### 4.5 Speed

Listing an ordinary item should require approximately 60 seconds.

### 4.6 Safety

Personal information should remain protected until disclosure becomes necessary.

### 4.7 Circular Commerce

The platform should encourage reuse rather than disposal.

## 5. TARGET USERS

### Persona A: The Declutterer

Age: 28 to 55

Lives in Lekki, Ikoyi, Victoria Island, Oniru, VGC, Chevron or similar communities.

Owns furniture, electronics, appliances and other household items.

Typical trigger:

Moving house
Upgrading household items
Relocation abroad
Changing furniture
Replacing electronics
Clearing storage

Primary requirement:

"I need this item gone without stress."

### Persona B: The Smart Buyer

Age: 22 to 45

Comfortable purchasing quality pre-owned items.

Primary motivation:

Value for money.

Requirements:

Trustworthy seller
Clear photographs
Condition information
Competitive price
Convenient collection or delivery

### Persona C: The Relocating Professional

Needs to sell multiple household assets within a short period.

Example:

A family relocating from Lagos to London needs to dispose of:

Television
Sofas
Dining table
Beds
Microwave
Generator
Car
Kitchen appliances

The platform should eventually support a "Moving Sale" mode allowing several listings to be grouped together.

### Persona D: The Deal Hunter

Regularly searches the marketplace for attractive opportunities.

May create alerts for:

iPhones
Televisions
Furniture
Vehicles
Luxury products

### Persona E: Professional Reseller

Purchases used products and resells them.

This user type should exist but should not dominate the initial consumer experience.

Business accounts may later become a separate commercial proposition.

## 6. VALUE PROPOSITION

ReWorth should differentiate itself around:
Trusted People

Verified identities and visible transaction history.
Trusted Items

Structured descriptions, image checks and condition declarations.
Trusted Payments

Secure payments and transaction protection.
Trusted Collection

Delivery partners, pickup options and recommended meeting points.
Hyperlocal Discovery

Show the user what is available nearby.

## 7. PRIMARY USER JOURNEY

#### Seller journey

Open app.

Tap SELL.

Take photographs.

AI analyses the photographs.

System proposes:

Item category
Suggested title
Possible brand
Condition
Description
Estimated market price range

Seller reviews suggestions.

Seller enters asking price.

Seller chooses:

#### Sell

#### Swap

#### Give Away

Seller selects location.

Seller chooses:

Buyer collection
Seller delivery
Platform delivery

Seller publishes.

Listing becomes available.

Seller receives:

Questions
Offers
Purchase requests

Seller accepts an offer.

Transaction proceeds.

Item is handed over or delivered.

Buyer confirms receipt.

Seller gets paid.

Both parties rate one another.

Listing becomes SOLD.

## 8. BUYER JOURNEY

User opens application.

Home screen identifies approximate location.

User sees:

Nearby items
Recently listed
Price drops
Recommended items
Popular near you
Verified sellers
Moving sales

User can search:

"LG TV"

"Dining table"

"Toyota Camry"

"iPhone 16"

Search results can be filtered by:

Distance
Price
Condition
Category
Seller verification
Delivery availability
Date listed

Buyer opens listing.

Buyer can:

Save
Share
Ask question
Make offer
Buy now
Propose swap

Buyer completes transaction.

## 9. LISTING ENGINE

Every listing must contain:

Listing ID
Seller ID
Title
Description
Category
Subcategory
Brand
Model
Condition
Age
Original purchase price, optional
Selling price
Negotiable, yes/no
Images
Video, optional
Location
Delivery options
Payment options
Created date
Expiry date
Views
Saves
Offers
Listing status

Status values:

Draft
Under Review
Live
Reserved
Sold
Expired
Removed
Rejected

## 10. AI ASSISTED LISTING

This should become one of the signature capabilities.

Seller takes 2 to 6 photographs.

Computer vision analyses the images.

The system proposes:

Object identification
Brand identification
Product type
Colour
Potential condition
Listing title
Description
Category
Suggested keywords

Example:

User photographs Samsung television.

System generates:
Samsung 55-inch Smart TV

Condition: Very Good

Samsung 55-inch Smart Television in very good working condition. Clean screen and body. Selling due to household upgrade.

Suggested price:

₦280,000 to ₦340,000.

The seller remains responsible for confirming accuracy.

## 11. PRICE INTELLIGENCE

The system should eventually provide price recommendations based on:

Comparable listings
Recently sold items
Item age
Brand
Condition
Location
Demand
Retail price where available

Display:

Estimated Market Range:

₦250,000 to ₦310,000

Recommended:

₦285,000

Quick Sale:

₦250,000

Maximum Value:

₦310,000

This feature should improve as marketplace transaction data increases.

## 12. SELLING METHODS

Every listing should support one or more modes.

#### Sell

Traditional monetary sale.

#### Swap

User exchanges an item for another item.

#### Swap + Cash

Example:

iPhone 15 + ₦200,000 for iPhone 16 Pro.

#### Give Away

Seller can give an item away.

Potential use cases:

Furniture
Children's products
Books
Household equipment

## 13. OFFER SYSTEM

Buyer may:

Buy at asking price.

Make an offer.

Seller may:

Accept
Reject
Counteroffer

The platform should preserve an offer history.

Offers should expire after a configurable period.

Default recommendation:

24 hours.

## 14. CHAT

Secure in-app communication is required.

Capabilities:

Text messaging
Image sharing
Listing preview
Make offer
Counteroffer
Delivery discussion
Transaction notification
Read status

Phone number and email address should not initially be visible.

Automated security should detect suspicious phrases involving:

Off-platform payment
Suspicious links
Advance payment requests
Potential scams

Users should be able to:

Block
Report
Mute

another user.

## 15. TRUST AND IDENTITY

Trust should become a major competitive advantage.

Verification levels:

#### Level 1

Phone verified.

#### Level 2

Email verified.

#### Level 3

Identity verified.

Potential Nigerian verification mechanisms:

NIN verification
BVN verification through appropriate licensed providers
Government ID
Facial verification

Sensitive identity data must not be publicly displayed.

Instead display:

Identity Verified ✓

## 16. TRUST SCORE

Users should develop a marketplace reputation.

Possible signals:

Identity verified
Account age
Successful transactions
Seller ratings
Buyer ratings
Response speed
Cancellation rate
Disputes
Listings removed
Reported activity

Public profile may show:

Oriyomi

★★★★★ 4.9

Identity Verified ✓

28 successful transactions

Member since 2026

Usually responds within 10 minutes.

## 17. PAYMENTS

Phase 1 should support Nigerian payment methods.

Options may include integrations with established Nigerian payment processors.

Possible methods:

Debit card
Bank transfer
Virtual account
USSD where supported

Where transaction protection applies:

Buyer pays.

Funds are held through the appropriate regulated payment structure or payment service provider.

Seller delivers item.

Buyer receives and inspects item.

Buyer confirms.

Payment is released.

The marketplace itself should not improperly hold customer funds outside an appropriate regulated payment framework.

## 18. BUYER PROTECTION

Applicable transactions should include protection.

Potential claims:

Item never received.

Item materially different from listing.

Counterfeit item.

Material undisclosed damage.

Incorrect product.

Dispute workflow:

Transaction → Report Problem → Submit Evidence → Seller Response → Review → Resolution.

## 19. LOGISTICS

Three fulfilment methods:

#### Buyer Pickup

Buyer collects from seller.

Exact residential address should not automatically be publicly shown.

#### Meet Point

Buyer and seller agree to meet.

The platform can eventually establish recommended safe exchange locations.

#### Delivery

Integrated logistics partner collects from seller and delivers to buyer.

Delivery quote should be presented before payment.

## 20. LOCATION ARCHITECTURE

Location is central to the application.

Examples:

Lekki Phase 1

### 1.4 km

Ikoyi

### 4.8 km

Victoria Island

### 6.2 km

Users should be able to browse:

Within 2 km
Within 5 km
Within 10 km
Within 25 km
All Lagos

Precise home addresses should never be exposed through browsing.

## 21. COMMUNITY MARKETPLACES

A strong differentiating capability should be private or semi-private communities.

Examples:

Banana Island Marketplace

VGC Marketplace

Lekki Phase 1 Marketplace

Eko Atlantic Community

Corporate Marketplace

Church Marketplace

Alumni Marketplace

Estate administrators could verify membership.

This recreates the trust that currently makes WhatsApp estate groups effective.

## 22. MOVING SALE

A seller should be able to create:
Moving Sale

"Relocating from Lekki, everything must go before 30 September."

Products can then appear under one collection.

Example:

12 items

₦3.7m combined asking price.

This could become a powerful acquisition feature.

## 23. HOME SCREEN

Recommended architecture:

Search bar

Current location

Hero module

"Find something worth keeping."

Primary categories

Nearby

Just Listed

Price Drops

Moving Sales

Cars

Home & Furniture

Electronics

Phones

Luxury

Recommended for You

Navigation:

Home
Discover

#### Sell

Chats
Profile

The SELL button should be visually dominant.

## 24. PRODUCT DETAIL PAGE

Must prominently show:

Large image gallery

Price

Title

Condition

Location

Time posted

Seller information

Verification status

Seller rating

Item description

Delivery options

Buyer protection indicator

Buttons:

MAKE OFFER

BUY NOW

SWAP

CHAT

SAVE

SHARE

## 25. SEARCH

Search should support:

Keyword search

Natural-language search

Example:

"Show me sofas under ₦500,000 around Lekki."

Future AI search:

"I'm furnishing a one-bedroom apartment and have ₦1.5 million."

The platform could return a bundle of appropriate marketplace listings.

## 26. CATEGORIES

#### Initial categories

Home & Furniture
Electronics
Phones & Tablets
Computers
Home Appliances
Vehicles
Fashion
Luxury
Children & Baby
Sports & Fitness
Office Equipment
Tools & Equipment
Books
Collectibles
Garden
Other

Property should not initially be mixed with consumer possessions.

It can become a separate vertical later if strategically justified.

## 27. VEHICLES

Vehicles require a dedicated listing structure.

Fields:

Make
Model
Year
Mileage
Transmission
Fuel type
Colour
Engine size
Vehicle condition
Accident history
Registration status
VIN, protected
Location
Price

Vehicle listings should later support inspection partners.

## 28. FAVOURITES

Users can save:

Items
Sellers
Searches

Example:

Saved Search:

"Samsung TV, Lekki, below ₦500k."

Push notification:

"3 new Samsung TVs were listed near you."

## 29. NOTIFICATIONS

Notification categories:

New message
New offer
Counteroffer
Offer accepted
Offer rejected
Item sold
Item saved
Price drop
Saved-search match
Payment received
Payment released
Delivery update
Verification update
Dispute update

Users must have granular notification preferences.

## 30. REVIEWS

After completed transactions:

Buyer rates seller.

Seller rates buyer.

Criteria may include:

Accuracy
Communication
Punctuality
Transaction experience

Reviews should only be available after genuine transactions.

## 31. ADMINISTRATION PLATFORM

A separate browser-based operations portal is required.

Dashboard should include:

Users
Listings
Transactions
Payments
Disputes
Verification
Reports
Fraud alerts
Support tickets
Promotions
Categories
Locations
Analytics
Content management

Administrators should be permission based.

Roles:

Super Admin
Operations
Customer Support
Risk & Fraud
Finance
Marketing
Content Moderator

All important administrator activity must be auditable.

## 32. FRAUD AND RISK ENGINE

The system should flag:

Duplicate images
Suspiciously low prices
Repeated phone/device accounts
Rapid creation of listings
Potential counterfeit products
Reported sellers
Repeated cancellations
Suspicious payment behaviour
Off-platform solicitation
Unusual location changes

Risk score:

Low
Medium
High

High-risk listings can require manual review.

## 33. CONTENT MODERATION

Prohibited categories must include illegal or regulated items where marketplace operation would be inappropriate.

The system must support:

Automated content scanning
Keyword filtering
Image moderation
Manual moderation
User reporting

Administrators must be able to immediately suspend listings and accounts.

## 34. BUSINESS MODEL

Initial priority should be liquidity and adoption rather than aggressive monetisation.

Potential revenue streams:

Transaction protection fee

Featured listings

Promoted listings

Seller subscriptions

Professional reseller accounts

Vehicle inspection

Delivery margin

Authentication services

Advertising

Premium community marketplaces

Corporate relocation services

## 35. PROPOSED MVP MONETISATION

#### Free

Registration
Browsing
Listing
Messaging
Offers

#### Paid

Boost Listing

Featured Listing

Buyer Protection

#### Delivery

Optional verification services where appropriate

The platform should avoid creating too much friction during early adoption.

## 36. KEY BUSINESS METRICS

#### North-level business metric

Successful transactions completed monthly.

Supporting metrics:

Monthly Active Users

New listings

Active listings

Sell-through rate

Median time to sale

Offer-to-sale conversion

Search-to-listing conversion

Listing-to-message conversion

Monthly GMV

Average transaction value

Repeat buyers

Repeat sellers

Buyer acquisition cost

Seller acquisition cost

Fraud rate

Dispute rate

Transaction completion rate

Customer satisfaction

NPS

## 37. MVP SUCCESS TARGETS

Initial launch targets should be defined around one concentrated Lagos geography rather than Nigeria nationally.

Example 90-day targets:

10,000 registered users

5,000 active listings

1,000 successful transactions

30%+ monthly active-user ratio

Under 3-minute median listing creation

Less than 1% confirmed fraud transaction rate

40%+ seller response within one hour

Targets should be recalibrated following beta testing.

## 38. DESIGN STANDARD

The application should not visually resemble a traditional classified-advertisement website.

Design direction:

Apple simplicity

Airbnb trust architecture

Monzo clarity

Pinterest-level visual discovery

Instagram familiarity

Carousell marketplace mechanics

Typography should be clean and highly legible.

Cards should prioritize:

Image

Price

Item title

Distance

Condition

Verification

Avoid visual clutter.

Avoid excessive text.

Use substantial white space.

Animations should be subtle.

Mobile interface must be thumb-friendly.

## 39. ACCESSIBILITY

Minimum requirements:

Readable text sizes

Strong contrast

Screen-reader compatibility

Accessible forms

Alternative image descriptions

Large interaction targets

Clear validation messages

## 40. TECHNICAL ARCHITECTURE

Recommended initial architecture:

#### Mobile

React Native or Flutter.

#### Web

Next.js / React.

#### Backend

Node.js with NestJS or equivalent enterprise framework.

#### Alternative

Python FastAPI.

#### Database

PostgreSQL.

#### Cache

Redis.

#### Object Storage

AWS S3 compatible storage.

#### Search

Elasticsearch / OpenSearch.

#### Authentication

OAuth 2.0 / JWT with secure refresh-token implementation.

Social authentication:

Apple
Google

Phone OTP should also be supported.

## 41. CORE BACKEND SERVICES

Architecture should provide logical separation for:

Authentication Service

User Service

Identity Service

Listing Service

Media Service

Search Service

Recommendation Service

Chat Service

Offer Service

Order Service

Payment Service

Delivery Service

Notification Service

Review Service

Fraud Service

Moderation Service

Analytics Service

Admin Service

These can initially exist within a modular monolith and be separated as scale demands.

Premature microservice complexity should be avoided.

## 42. CORE DATA ENTITIES

User

Profile

Address

Verification

Listing

ListingImage

Category

Favourite

SavedSearch

Conversation

Message

Offer

Order

Payment

Payout

#### Delivery

Review

Dispute

Report

Notification

Promotion

Transaction

AuditLog

Device

RiskEvent

Community

CommunityMembership

## 43. API PRINCIPLES

API design should be:

RESTful initially.

Versioned:

/api/v1/

Examples:

POST /auth/register

POST /auth/login

POST /auth/verify-phone

GET /listings

POST /listings

GET /listings/{id}

PATCH /listings/{id}

DELETE /listings/{id}

POST /listings/{id}/offers

POST /listings/{id}/favourite

GET /search

POST /orders

POST /payments

POST /messages

GET /conversations

POST /disputes

GET /notifications

Admin APIs must be separately authorised.

## 44. SECURITY

Mandatory controls:

Encryption in transit

Encryption at rest

Secure password hashing

OTP rate limiting

JWT rotation

Device monitoring

Audit logging

Role-based access control

API rate limiting

Secure file upload

Malware scanning

Injection protection

XSS protection

CSRF protection where applicable

Secrets management

Database backups

Disaster recovery

Security event logging

Penetration testing before public launch

## 45. PRIVACY

The system must operate in accordance with applicable Nigerian privacy and data protection requirements.

Privacy-by-design principles should apply.

Collect only required personal information.

Users must be able to:

Access personal data

Correct personal data

Manage communication preferences

Request account deletion, subject to lawful retention requirements

Review privacy disclosures

Consent to relevant processing

## 46. PERFORMANCE REQUIREMENTS

Target API response:

Under 500ms for standard requests where reasonably achievable.

Initial screen load:

Under 3 seconds on typical Nigerian mobile networks.

Images should use:

Automatic compression

Multiple resolutions

Lazy loading

WebP/AVIF where supported

CDN distribution

The application must be designed for inconsistent network connectivity.

## 47. OBSERVABILITY

Production environment should include:

Application monitoring

Infrastructure monitoring

Error tracking

API latency monitoring

Payment monitoring

Fraud monitoring

Audit logs

Product analytics

Alerting

Recommended categories of tooling include:

Sentry

Datadog

Grafana

OpenTelemetry

Product analytics platform

## 48. ENVIRONMENTS

Development

Testing

Staging

Production

Production credentials must never be shared with development environments.

CI/CD deployment should require automated testing.

## 49. TESTING

Required test coverage:

Unit testing

API testing

Integration testing

UI testing

Payment testing

Security testing

Performance testing

Regression testing

User acceptance testing

Device testing

Network-resilience testing

## 50. MVP SCOPE

The first production release should contain:

User registration

Phone verification

Profiles

Basic identity verification

Create listing

Photo upload

AI listing assistance

Categories

#### Search

Location filters

Product pages

Favourite

Chat

Offers

Buy Now

Basic protected payment architecture

Pickup

Delivery integration

Notifications

Reviews

Reporting

Admin dashboard

Basic moderation

Transaction history

## 51. PHASE TWO

Swap marketplace

Moving Sales

Estate communities

Saved-search alerts

Advanced recommendations

AI price intelligence

Vehicle inspection

Luxury authentication

Seller analytics

Professional sellers

Referral programme

## 52. PHASE THREE

AI marketplace assistant

Automated valuation

Instant-buy service

Consignment service

Managed pickup

Corporate relocation marketplace

Estate partnerships

Circular-economy partnerships

National expansion

Cross-border recommerce where viable

## 53. FUTURE AI EXPERIENCE

The eventual experience should allow a user to photograph their living room.

The application identifies saleable products.

Example:

Samsung television

LG soundbar

Dining table

Six dining chairs

Coffee table

Floor lamp

The platform asks:

"Would you like to sell these six items?"

The user confirms.

Draft listings are created automatically.

This should become a long-term product differentiator.

## 54. GO-TO-MARKET

Do not initially launch throughout Nigeria.

Create marketplace density.

Phase 1:

Lekki Phase 1

Ikoyi

Victoria Island

Oniru

Chevron

VGC

Ajah

Target:

Estate residents

Relocating families

Expatriates

Professionals

Interior designers

Property managers

Corporate relocation teams

Estate managers

## 55. SUPPLY-FIRST STRATEGY

Before public launch, seed the marketplace.

Target:

500 sellers

2,500 to 5,000 quality items.

An empty marketplace will fail irrespective of technology quality.

The initial commercial objective therefore is not downloads.

It is quality supply density.

## 56. MARKETPLACE LAUNCH MODEL

Recruit "Founding Sellers."

Provide:

Free verification

Free listings

Free collection support

Free featured listing

Early seller badge

Potential launch proposition:
Lagos, your unused things are worth something.

Another:
Before you throw it away, list it.

Another:
Someone nearby wants what you no longer need.

## 57. OPERATING MODEL

Technology alone will not create trust.

The operating model must include:

Customer support

Marketplace operations

Fraud operations

Verification

Payment operations

Dispute resolution

Logistics support

Content moderation

Seller acquisition

Community partnerships

Product management

Engineering

Data and analytics

## 58. MVP ACCEPTANCE CRITERIA

A user must be able to:

Create an account.

Verify their mobile number.

Create a listing using photographs.

Receive an AI-generated draft title and description.

Set a price.

Publish a listing.

Find nearby products.

Search products.

Save a listing.

Message a seller.

Make an offer.

Accept or reject an offer.

Initiate a transaction.

Select pickup or delivery.

Receive transaction notifications.

Mark an item as received.

Complete a transaction.

Review another user.

Report a problem.

An administrator must be able to:

View users.

View listings.

Moderate listings.

Suspend accounts.

Review reports.

Review transactions.

Review disputes.

View basic marketplace analytics.

## 59. DEFINITION OF DONE

A feature is considered complete only when:

Functional requirements pass.

UX has been approved.

Responsive behaviour works.

Security review is complete.

Analytics events are implemented.

Error states exist.

Loading states exist.

Empty states exist.

Accessibility requirements are addressed.

Automated tests pass.

Documentation is updated.

Product Owner acceptance is obtained.

## 60. PRODUCT AMBITION

ReWorth should not simply become a place where people sell used goods.

It should become the infrastructure through which Nigerians give economic value to things they already own.

The strategic journey is:

CLASSIFIEDS

→ TRUSTED MARKETPLACE

→ RECOMMERCE PLATFORM

→ ASSET LIQUIDITY PLATFORM

Eventually the platform should answer one simple consumer question:
"What are the things around me worth, and who wants them?"

That is the larger opportunity.
