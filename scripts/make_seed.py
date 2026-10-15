"""Generates scripts/seed_demo.sql: FAKE demo data shaped like rets_property / california_sold.
Only the columns used in Weeks 0-3 exist. Drop these tables before importing the real dumps."""
import random, json
random.seed(42)
CITIES = {"Irvine":("92618",33.68,-117.82,1.0),"Newport Beach":("92660",33.62,-117.9,1.9),"Pasadena":("91101",34.15,-118.14,1.3),
 "San Diego":("92101",32.72,-117.16,1.0),"Los Angeles":("90012",34.05,-118.24,1.2),"Riverside":("92501",33.95,-117.4,0.6),
 "Temecula":("92591",33.49,-117.15,0.7),"Palm Springs":("92262",33.83,-116.55,0.8),"Anaheim":("92805",33.84,-117.91,0.8),"Murrieta":("92562",33.55,-117.21,0.7)}
TYPES = [("SingleFamilyResidence",.55,1.0),("Condominium",.30,.55),("Townhouse",.15,.65)]
AGENTS=[("Jane","Doe"),("Carlos","Ramirez"),("Mei","Chen"),("Sam","Patel"),("Olivia","Brooks")]
OFFICES=["IDX Realty","Pacific Coast Homes","Golden State Brokers","Sunrise Properties"]
STREETS=["Main St","Oak Ave","Maple Dr","Sunset Blvd","Lakeview Ct","Palm Way","Cedar Ln","Harbor Rd"]
def esc(s): return str(s).replace("\\","\\\\").replace("'","''")
def q(v): return "NULL" if v is None else (f"'{esc(v)}'" if isinstance(v,str) else str(v))
def prop():
    city=random.choice(list(CITIES)); z,la,lo,m=CITIES[city]
    t=random.choices(TYPES,[x[1] for x in TYPES])[0]
    beds=random.choice([1,2,2,3,3,3,4,4,5]) if t[0]!="Condominium" else random.choice([1,2,2,3])
    baths=min(beds,random.choice([1,1.5,2,2.5,3,3.5]))
    sqft=int(random.gauss(550*beds+500,250)); sqft=max(500,sqft)
    price=int((sqft*random.uniform(450,650)*m*t[2])/1000)*1000
    return city,z,la,lo,t[0],beds,baths,sqft,price
out=["SET NAMES utf8mb4;","DROP TABLE IF EXISTS rets_property;","DROP TABLE IF EXISTS california_sold;",
"""CREATE TABLE rets_property (
 id INT AUTO_INCREMENT PRIMARY KEY, L_ListingID VARCHAR(20), L_DisplayId VARCHAR(20), L_Address VARCHAR(255), L_City VARCHAR(100), L_Zip VARCHAR(10),
 L_Class VARCHAR(50), L_Type_ VARCHAR(50), L_Keyword2 INT, LM_Dec_3 DECIMAL(4,1), L_SystemPrice INT, LM_Int2_3 INT,
 LMD_MP_Latitude DECIMAL(18,15), LMD_MP_Longitude DECIMAL(19,15), L_Status VARCHAR(30), L_Remarks MEDIUMTEXT, L_Photos LONGTEXT,
 LA1_UserFirstName VARCHAR(50), LA1_UserLastName VARCHAR(50), ListAgentEmail VARCHAR(100), ListAgentDirectPhone VARCHAR(30), LO1_OrganizationName VARCHAR(100),
 YearBuilt INT, AssociationFee INT, DaysOnMarket INT, PoolPrivateYN VARCHAR(10), FireplaceYN VARCHAR(10), ViewYN VARCHAR(10), PhotoCount INT,
 StandardStatus VARCHAR(30), INDEX(L_City), INDEX(L_Zip), INDEX(L_Type_), INDEX(L_SystemPrice), FULLTEXT KEY ft_remarks (L_Remarks)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;""",
"""CREATE TABLE california_sold (
 ListingKey BIGINT, ClosePrice DOUBLE, CloseDate VARCHAR(10), OriginalListPrice DOUBLE, ListPrice DOUBLE, DaysOnMarket BIGINT,
 PropertyType VARCHAR(50), PropertySubType VARCHAR(50), LivingArea DOUBLE, BedroomsTotal DOUBLE, BathroomsTotalInteger DOUBLE, YearBuilt DOUBLE,
 City VARCHAR(100), PostalCode VARCHAR(10), UnparsedAddress VARCHAR(255), ListAgentFullName VARCHAR(100), ListOfficeName VARCHAR(100), BuyerOfficeName VARCHAR(100),
 INDEX(City), INDEX(CloseDate), INDEX(ListingKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"""]
rows=[]
for i in range(3000):
    city,z,la,lo,t,beds,baths,sqft,price=prop()
    pool=random.random()<.25; view=random.random()<.2; fire=random.random()<.4
    hoa=random.choice([250,350,450,550,700]) if t!="SingleFamilyResidence" else (random.choice([0,0,0,120,200]) or None)
    a=random.choice(AGENTS); st=random.choices(["Active","Pending"],[.9,.1])[0]; n=random.randint(5,40)
    rem=f"{beds} bedroom {t} in {city}."+(" Private pool." if pool else "")+(" Stunning views." if view else "")
    rows.append("("+",".join(map(q,[f"DEMO{100000+i}",f"OC{2000000+i}",f"{random.randint(1,9999)} {random.choice(STREETS)}",city,z,"Residential",t,beds,baths,price,sqft,
      round(la+random.uniform(-.05,.05),6),round(lo+random.uniform(-.05,.05),6),st,rem,json.dumps([f"https://example.invalid/photo/{i}/{k}.jpg" for k in range(3)]),
      a[0],a[1],f"{a[0].lower()}@example.com","555-0100",random.choice(OFFICES),random.randint(1960,2023),hoa,random.randint(1,120),
      "True" if pool else "False","True" if fire else "False","True" if view else "False",n,st]))+")")
cols="L_ListingID,L_DisplayId,L_Address,L_City,L_Zip,L_Class,L_Type_,L_Keyword2,LM_Dec_3,L_SystemPrice,LM_Int2_3,LMD_MP_Latitude,LMD_MP_Longitude,L_Status,L_Remarks,L_Photos,LA1_UserFirstName,LA1_UserLastName,ListAgentEmail,ListAgentDirectPhone,LO1_OrganizationName,YearBuilt,AssociationFee,DaysOnMarket,PoolPrivateYN,FireplaceYN,ViewYN,PhotoCount,StandardStatus"
for k in range(0,len(rows),500): out.append(f"INSERT INTO rets_property ({cols}) VALUES\n"+",\n".join(rows[k:k+500])+";")
from datetime import date, timedelta
rows=[]
for i in range(8000):
    city,z,la,lo,t,beds,baths,sqft,price=prop()
    d=date(2021,1,1)+timedelta(days=random.randint(0,1825)); lst=int(price*random.uniform(.97,1.05)); close=int(lst*random.uniform(.93,1.04))
    pt="Residential" if random.random()<.93 else random.choice(["ResidentialLease","Land"]); a=random.choice(AGENTS)
    rows.append("("+",".join(map(q,[900000+i,close,d.isoformat(),int(lst*1.03),lst,random.randint(3,90),pt,t,sqft,beds,int(baths),random.randint(1960,2023),city,z,
      f"{random.randint(1,9999)} {random.choice(STREETS)}",f"{a[0]} {a[1]}",random.choice(OFFICES),random.choice(OFFICES)]))+")")
for k in range(0,len(rows),500): out.append("INSERT INTO california_sold VALUES\n"+",\n".join(rows[k:k+500])+";")
open("scripts/seed_demo.sql","w").write("\n".join(out)+"\n"); print("ok")
